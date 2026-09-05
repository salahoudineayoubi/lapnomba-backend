/**
 * Le middleware `isAuth` protège la route REST d'export Excel
 * (GET /api/export-candidatures) exactement comme il protégerait n'importe
 * quelle route admin — testé ici directement (sans serveur HTTP réel).
 */
import { isAuth } from "../../src/middlewares/isAuth";
import { signAdminToken } from "../../src/utils/auth";

const buildRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("isAuth middleware (export Excel / routes admin REST)", () => {
  it("11. rejette une requête sans token (401)", () => {
    const req: any = { headers: {} };
    const res = buildRes();
    const next = jest.fn();

    isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejette un token invalide (401)", () => {
    const req: any = { headers: { authorization: "Bearer token-invalide" } };
    const res = buildRes();
    const next = jest.fn();

    isAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("12. laisse passer une requête admin avec un token valide", () => {
    const token = signAdminToken({ email: "admin@lapnomba.org", role: "admin" });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res = buildRes();
    const next = jest.fn();

    isAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.admin?.email).toBe("admin@lapnomba.org");
  });
});
