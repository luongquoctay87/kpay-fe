/** Four ACB device ids merged with vendor-base JSON on save. */
export interface AcbAccountKeysInput {
  userId: string;
  deviceId: string;
  acbAndroidId?: string;
  safekeyDevicePrefix?: string;
}

export interface AcbVendorCsvPreview {
  csvAccount: string;
  accountMatch: boolean;
  credentialsJson: string;
}

export interface UpsertBankAccountAcbCredentialsBody {
  password: string;
  totpCode?: string;
  credentialsJson?: string;
  accountKeys?: AcbAccountKeysInput;
  proxyUrl?: string;
  workerEnabled?: boolean;
}
