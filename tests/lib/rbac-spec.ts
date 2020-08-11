import * as Rbac from "../../lib/rbac";
import { expect } from "chai";
import {
  PERMISSIONS,
  RESOURCES,
  ROLE,
  RBAC_DATA_TYPE,
} from "../../models/role";

describe("rbac decorator", () => {
  describe("getResourceFromClassName", () => {
    it("returns resource from class name", () => {
      expect(Rbac.getResourceFromClassName("CategoryController")).to.be.eql(
        RESOURCES.CATEGORY
      );
      expect(Rbac.getResourceFromClassName("FooController")).to.be.undefined;
    });
  });
  describe("checkHasRole", () => {
    it("returns true if user has role; false otherwise", () => {
      const user = {
        roles: [ROLE.MANAGER],
      };
      const rbacData: RBAC_DATA_TYPE = {
        [ROLE.MANAGER]: {
          [RESOURCES.ORDER]: [PERMISSIONS.READ, PERMISSIONS.CREATE],
        },
      };
      const admin = {
        roles: [ROLE.SUPER],
      };
      expect(Rbac.checkHasRole(undefined, null, rbacData)).to.be.true;
      expect(Rbac.checkHasRole(user, null, rbacData)).to.be.true;
      expect(
        Rbac.checkHasRole(
          user,
          { resource: RESOURCES.ORDER, permission: PERMISSIONS.READ },
          rbacData
        )
      ).to.be.true;
      expect(
        Rbac.checkHasRole(
          user,
          { resource: RESOURCES.CATEGORY, permission: PERMISSIONS.READ },
          rbacData
        )
      ).to.be.false;
      expect(
        Rbac.checkHasRole(
          admin,
          { resource: RESOURCES.STATISTICS, permission: PERMISSIONS.READ },
          rbacData
        )
      ).to.be.true;
    });
  });
});
