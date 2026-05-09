export interface UserPublic {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: UserPublic;
  access_token?: string;
}
