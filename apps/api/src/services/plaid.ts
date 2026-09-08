import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";
import "dotenv/config";

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || "sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
      "PLAID-SECRET": process.env.PLAID_SECRET!,
    },
  },
});

export const plaidClient = new PlaidApi(config);

export async function createLinkToken() {
  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: "demo-user" },
    client_name: "Fintrace",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return response.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

export async function syncTransactions(
  accessToken: string,
  cursor?: string | null
) {
  const response = await plaidClient.transactionsSync({
    access_token: accessToken,
    cursor: cursor || undefined,
  });
  return {
    added: response.data.added,
    modified: response.data.modified,
    removed: response.data.removed,
    nextCursor: response.data.next_cursor,
    hasMore: response.data.has_more,
  };
}

export async function getAccounts(accessToken: string) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });
  return response.data.accounts;
}
