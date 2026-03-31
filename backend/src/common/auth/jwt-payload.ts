/** Payload do access JWT (single-tenant — sem isolamento por inquilino). */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}
