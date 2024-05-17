import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import { WPLATEST_ACTIONS } from './constants'
import type {
  ApiErrorResponse,
  CreateNewVersionInput,
  CreateNewVersionResponse
} from './types'
import { getWorkflowInput, createNewVersion } from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const {
      ARTIFACT_URL,
      GITHUB_TOKEN,
      WPLATEST_TOKEN,
      WPLATEST_ACTION,
      WPLATEST_PLUGIN_ID
    } = getWorkflowInput()

    if (!WPLATEST_ACTIONS.includes(WPLATEST_ACTION)) {
      core.setFailed(
        `Invalid action: ${WPLATEST_ACTION}. Must be one of: ${WPLATEST_ACTIONS.join(', ')}`
      )
      return
    }

    const octokit = getOctokit(GITHUB_TOKEN)
    const pullRequestsNo = context.payload.pull_request?.number ?? 0
    const repo = context.repo

    if (WPLATEST_ACTION === 'create-new-version') {
      core.info(`Creating new plugin version: ${WPLATEST_PLUGIN_ID}`)

      if (ARTIFACT_URL) {
        core.info(`Using artifact URL: ${ARTIFACT_URL}`)
      }

      const siteName = `${repo.owner}-${repo.repo}-${context.sha}`
      const siteNameMaxLen = siteName.substring(0, 30)

      const config = {
        zip_url: ARTIFACT_URL,
        plugin_id: WPLATEST_PLUGIN_ID
      } satisfies CreateNewVersionInput

      core.info(`Creating new version with config: ${JSON.stringify(config)}`)

      try {
        const response = await createNewVersion(config, {
          token: WPLATEST_TOKEN
        })

        if (!response.ok) {
          if (
            response.headers.get('content-type')?.includes('application/json')
          ) {
            const data = (await response.json()) as ApiErrorResponse

            core.setFailed(
              `Failed to create new version: ${data.message ?? 'No data returned from WPLatest API'}`
            )

            return
          }

          core.setFailed(
            `Failed to create new version: ${response.statusText ?? 'No data returned from WPLatest API'}`
          )
        }

        const data = (await response.json()) as CreateNewVersionResponse

        core.info(`New version created: ${data.id} - ${data.version}`)
      } catch (err) {
        const error = err as Error | unknown
        const msg = error instanceof Error ? error.message : 'Unknown error'

        core.setFailed(`Failed to create new version: ${msg}`)
      }
    } else {
      core.setFailed(`${WPLATEST_ACTION} has not been implemented yet.`)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
