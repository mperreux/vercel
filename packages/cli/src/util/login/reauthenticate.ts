import chalk from 'chalk';
import doSamlLogin from './saml.js';
import showLoginPrompt from './prompt.js';
import { LoginResult, SAMLError } from './types.js';
import confirm from '../input/confirm.js';
import Client from '../client.js';

const { bold } = chalk;

export default async function reauthenticate(
  client: Client,
  error: Pick<SAMLError, 'enforced' | 'scope' | 'teamId'>
): Promise<LoginResult> {
  if (error.teamId && error.enforced) {
    // If team has SAML enforced then trigger the SSO login directly
    client.output.log(
      `You must re-authenticate with SAML to use ${bold(error.scope)} scope.`
    );
    if (await confirm(client, `Log in with SAML?`, true)) {
      return doSamlLogin(client, error.teamId);
    }
  } else {
    // Personal account, or team that does not have SAML enforced
    client.output.log(
      `You must re-authenticate to use ${bold(error.scope)} scope.`
    );
    return showLoginPrompt(client, error);
  }
  return 1;
}
