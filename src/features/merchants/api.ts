import { apiClient, unwrap } from "@/lib/api/client";
import { downloadXlsx } from "@/lib/api/download-blob";
import type {
  CreateMerchantBody,
  CreateMerchantResp,
  MerchantCredentialsResp,
  MerchantDetail,
  MerchantIpWhitelistItem,
  MerchantListParams,
  MerchantListResp,
  MerchantStatus,
  MerchantVietpmBot,
  MerchantTelegramPayout,
  UpdateChannelItem,
  UpdateFeeItem,
  UpdateMerchantBody,
} from "@/features/merchants/types";

export const merchantApi = {
  list(params: MerchantListParams = {}): Promise<MerchantListResp> {
    return unwrap(
      apiClient.get("/merchants", {
        params: {
          name: params.name || undefined,
          status: params.status || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }),
    );
  },

  async export(params: { name?: string; status?: MerchantStatus } = {}): Promise<void> {
    const res = await apiClient.get("/merchants/export", {
      params: {
        name: params.name || undefined,
        status: params.status || undefined,
      },
      responseType: "blob",
    });
    downloadXlsx(res.data, "merchants.xlsx");
  },

  getById(id: string): Promise<MerchantDetail> {
    return unwrap(apiClient.get(`/merchants/${id}`));
  },

  generateCode(): Promise<{ code: string }> {
    return unwrap(apiClient.get("/merchants/generate-code"));
  },

  create(body: CreateMerchantBody): Promise<CreateMerchantResp> {
    return unwrap(apiClient.post("/merchants", body));
  },

  update(id: string, body: UpdateMerchantBody): Promise<MerchantDetail> {
    return unwrap(apiClient.patch(`/merchants/${id}`, body));
  },

  updateStatus(id: string, body: { status: MerchantStatus }): Promise<MerchantDetail> {
    return unwrap(apiClient.patch(`/merchants/${id}/status`, body));
  },

  delete(id: string): Promise<void> {
    return unwrap(apiClient.delete(`/merchants/${id}`));
  },

  adjustWallet(
    id: string,
    body: { deltaAvailable: number; note?: string },
  ): Promise<MerchantDetail["wallet"]> {
    return unwrap(apiClient.patch(`/merchants/${id}/wallet`, body));
  },

  updateChannels(id: string, channels: UpdateChannelItem[]): Promise<MerchantDetail> {
    return unwrap(apiClient.put(`/merchants/${id}/channels`, { channels }));
  },

  updateFees(id: string, fees: UpdateFeeItem[]): Promise<MerchantDetail> {
    return unwrap(apiClient.put(`/merchants/${id}/fees`, { fees }));
  },

  revealCredentials(id: string): Promise<MerchantCredentialsResp> {
    return unwrap(apiClient.get(`/merchants/${id}/credentials`));
  },

  resetCredentials(id: string): Promise<MerchantCredentialsResp> {
    return unwrap(apiClient.post(`/merchants/${id}/credentials/reset`));
  },

  updateTelegramPayout(id: string, body: MerchantTelegramPayout): Promise<MerchantDetail> {
    return unwrap(apiClient.put(`/merchants/${id}/telegram-payout`, body));
  },

  updateVietpmBot(id: string, body: MerchantVietpmBot): Promise<MerchantDetail> {
    return unwrap(apiClient.put(`/merchants/${id}/vietpm-bot`, body));
  },

  listIpWhitelist(id: string): Promise<MerchantIpWhitelistItem[]> {
    return unwrap(apiClient.get(`/merchants/${id}/ip-whitelist`));
  },

  addIpWhitelist(
    id: string,
    body: { cidr: string; note?: string },
  ): Promise<MerchantIpWhitelistItem> {
    return unwrap(apiClient.post(`/merchants/${id}/ip-whitelist`, body));
  },

  deleteIpWhitelist(id: string, entryId: string): Promise<void> {
    return unwrap(apiClient.delete(`/merchants/${id}/ip-whitelist/${entryId}`));
  },

  resetPassword(id: string, body: { newPassword: string }): Promise<void> {
    return unwrap(apiClient.post(`/merchants/${id}/reset-password`, body));
  },
};
