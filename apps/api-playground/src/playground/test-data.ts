export class TestData {
  getYnabToken(): string | undefined {
    return process.env.YNAB_API_KEY;
  }

  getConfigFileUrl(): string | undefined {
    return process.env.INVESTMENTS_CONFIG_FILE_URL;
  }
}
