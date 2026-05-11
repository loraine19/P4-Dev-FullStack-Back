/* IUSER PUBLIC */
export interface IUserPublic {
  id: number;
  email: string;
  name: string;
}

/* IAUTH RESPONSE */
export interface IAuthResponse {
  user: IUserPublic;
  access_token?: string;
}

