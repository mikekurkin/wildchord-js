export interface RecordResponse {
  id: string;
  url: string;
  contents?: string;
  author: number;
  title_line: string;
  second_line: string;
  create_timestamp: string;
  update_timestamp: string;
  is_public: boolean;
  can_edit: boolean;
}

export interface User {
  pk: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface CurrentUser {
  is_anonymous: boolean;
  id?: number;
  username?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshResponse {
  access: string;
  access_token_expiration: string;
}

export interface RecordListResponse {
  count: number;
  next: string;
  previous: string;
  results: [RecordResponse];
}

export interface RecordDict {
  [id: string]: RecordResponse;
}

export interface ErrorResponse {
  non_field_errors: [string];
}
