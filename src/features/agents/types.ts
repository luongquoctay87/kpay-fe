/** Align với BE Agent list/detail. */
export interface AgentListItem {
  id: string;
  name: string;
  phone?: string | null;
  balance?: number | null;
  active?: boolean;
  createdAt?: string;
}

export interface AgentDetail {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  active: boolean;
  balance?: number | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentListResp {
  items: AgentListItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface AgentListParams {
  name?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface CreateAgentBody {
  name: string;
  username: string;
  password: string;
  email?: string;
  telegramId?: string;
  phone?: string;
}

/** Partial update — chuỗi rỗng được BE hiểu là xoá giá trị. */
export interface UpdateAgentBody {
  name?: string;
  email?: string;
  telegramId?: string;
  phone?: string;
}
