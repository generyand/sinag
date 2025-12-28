/**
 * Tests for Navigation Configuration
 *
 * Verifies that the navigation configuration:
 * - Returns correct navigation items for each user role
 * - Provides correct default dashboard paths
 * - Returns accurate portal names
 * - Handles undefined/null roles appropriately
 */

import { describe, it, expect } from "vitest";
import {
  getNavigationByRole,
  getDefaultDashboard,
  getPortalName,
  mlgooNavigation,
  blguNavigation,
  assessorNavigation,
  validatorNavigation,
  katuparanNavigation,
  type NavItem,
} from "../navigation";

describe("Navigation Configuration", () => {
  describe("mlgooNavigation", () => {
    it("should have correct number of items", () => {
      expect(mlgooNavigation).toHaveLength(8);
    });

    it("should have Dashboard as first item", () => {
      expect(mlgooNavigation[0]).toEqual({
        name: "Dashboard",
        href: "/mlgoo/dashboard",
        icon: "home",
      });
    });

    it("should include User Management", () => {
      const userMgmt = mlgooNavigation.find((item) => item.name === "User Management");
      expect(userMgmt).toEqual({
        name: "User Management",
        href: "/user-management",
        icon: "users",
      });
    });

    it("should include System Settings", () => {
      const settings = mlgooNavigation.find((item) => item.name === "System Settings");
      expect(settings).toEqual({
        name: "System Settings",
        href: "/mlgoo/settings",
        icon: "settings",
      });
    });

    it("should include Analytics & Reports", () => {
      const analytics = mlgooNavigation.find((item) => item.name === "Analytics & Reports");
      expect(analytics).toEqual({
        name: "Analytics & Reports",
        href: "/analytics",
        icon: "chart",
      });
    });

    it("should include Assessment Cycles", () => {
      const cycles = mlgooNavigation.find((item) => item.name === "Assessment Cycles");
      expect(cycles).toEqual({
        name: "Assessment Cycles",
        href: "/mlgoo/cycles",
        icon: "calendar",
      });
    });

    it("should have Profile as last item", () => {
      expect(mlgooNavigation[mlgooNavigation.length - 1]).toEqual({
        name: "Profile",
        href: "/mlgoo/profile",
        icon: "user",
      });
    });
  });

  describe("blguNavigation", () => {
    it("should have correct number of items", () => {
      expect(blguNavigation).toHaveLength(3);
    });

    it("should include Dashboard", () => {
      expect(blguNavigation[0]).toEqual({
        name: "Dashboard",
        href: "/blgu/dashboard",
        icon: "home",
      });
    });

    it("should include My Assessments", () => {
      expect(blguNavigation[1]).toEqual({
        name: "My Assessments",
        href: "/blgu/assessments",
        icon: "clipboard",
      });
    });

    it("should include Profile", () => {
      expect(blguNavigation[2]).toEqual({
        name: "Profile",
        href: "/blgu/profile",
        icon: "user",
      });
    });
  });

  describe("assessorNavigation", () => {
    it("should have correct number of items", () => {
      expect(assessorNavigation).toHaveLength(3);
    });

    it("should include Submissions Queue", () => {
      expect(assessorNavigation[0]).toEqual({
        name: "Submissions Queue",
        href: "/assessor/submissions",
        icon: "clipboard",
      });
    });

    it("should include Analytics", () => {
      expect(assessorNavigation[1]).toEqual({
        name: "Analytics",
        href: "/assessor/analytics",
        icon: "chart",
      });
    });

    it("should include Profile", () => {
      expect(assessorNavigation[2]).toEqual({
        name: "Profile",
        href: "/assessor/profile",
        icon: "user",
      });
    });
  });

  describe("validatorNavigation", () => {
    it("should have correct number of items", () => {
      expect(validatorNavigation).toHaveLength(2);
    });

    it("should include Submissions Queue", () => {
      expect(validatorNavigation[0]).toEqual({
        name: "Submissions Queue",
        href: "/validator/submissions",
        icon: "clipboard",
      });
    });

    it("should include Profile", () => {
      expect(validatorNavigation[1]).toEqual({
        name: "Profile",
        href: "/validator/profile",
        icon: "user",
      });
    });
  });

  describe("katuparanNavigation", () => {
    it("should have correct number of items", () => {
      expect(katuparanNavigation).toHaveLength(3);
    });

    it("should include Dashboard", () => {
      expect(katuparanNavigation[0]).toEqual({
        name: "Dashboard",
        href: "/katuparan/dashboard",
        icon: "home",
      });
    });

    it("should include Reports", () => {
      expect(katuparanNavigation[1]).toEqual({
        name: "Reports",
        href: "/katuparan/reports",
        icon: "clipboard",
      });
    });

    it("should include Profile", () => {
      expect(katuparanNavigation[2]).toEqual({
        name: "Profile",
        href: "/katuparan/profile",
        icon: "user",
      });
    });
  });
});

describe("getNavigationByRole", () => {
  describe("Valid Roles", () => {
    it("should return MLGOO navigation for MLGOO_DILG role", () => {
      const nav = getNavigationByRole("MLGOO_DILG");
      expect(nav).toEqual(mlgooNavigation);
      expect(nav).toHaveLength(8);
    });

    it("should return Assessor navigation for ASSESSOR role", () => {
      const nav = getNavigationByRole("ASSESSOR");
      expect(nav).toEqual(assessorNavigation);
      expect(nav).toHaveLength(3);
    });

    it("should return Validator navigation for VALIDATOR role", () => {
      const nav = getNavigationByRole("VALIDATOR");
      expect(nav).toEqual(validatorNavigation);
      expect(nav).toHaveLength(2);
    });

    it("should return Katuparan navigation for KATUPARAN_CENTER_USER role", () => {
      const nav = getNavigationByRole("KATUPARAN_CENTER_USER");
      expect(nav).toEqual(katuparanNavigation);
      expect(nav).toHaveLength(3);
    });

    it("should return BLGU navigation for BLGU_USER role", () => {
      const nav = getNavigationByRole("BLGU_USER");
      expect(nav).toEqual(blguNavigation);
      expect(nav).toHaveLength(3);
    });
  });

  describe("Invalid Roles", () => {
    it("should return BLGU navigation for undefined role", () => {
      const nav = getNavigationByRole(undefined);
      expect(nav).toEqual(blguNavigation);
    });

    it("should return BLGU navigation for unknown role", () => {
      const nav = getNavigationByRole("UNKNOWN_ROLE");
      expect(nav).toEqual(blguNavigation);
    });

    it("should return BLGU navigation for empty string role", () => {
      const nav = getNavigationByRole("");
      expect(nav).toEqual(blguNavigation);
    });
  });

  describe("Navigation Structure", () => {
    it("should return array of NavItems with correct structure", () => {
      const nav = getNavigationByRole("MLGOO_DILG");

      nav.forEach((item: NavItem) => {
        expect(item).toHaveProperty("name");
        expect(item).toHaveProperty("href");
        expect(item).toHaveProperty("icon");
        expect(typeof item.name).toBe("string");
        expect(typeof item.href).toBe("string");
        expect(typeof item.icon).toBe("string");
      });
    });

    it("should have unique hrefs within each role navigation", () => {
      const nav = getNavigationByRole("MLGOO_DILG");
      const hrefs = nav.map((item) => item.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });

    it("should have non-empty names", () => {
      const nav = getNavigationByRole("ASSESSOR");
      nav.forEach((item) => {
        expect(item.name.length).toBeGreaterThan(0);
      });
    });

    it("should have valid href paths starting with /", () => {
      const nav = getNavigationByRole("VALIDATOR");
      nav.forEach((item) => {
        expect(item.href).toMatch(/^\//);
      });
    });
  });
});

describe("getDefaultDashboard", () => {
  describe("Valid Roles", () => {
    it("should return correct dashboard for MLGOO_DILG", () => {
      expect(getDefaultDashboard("MLGOO_DILG")).toBe("/mlgoo/dashboard");
    });

    it("should return correct dashboard for ASSESSOR", () => {
      expect(getDefaultDashboard("ASSESSOR")).toBe("/assessor/submissions");
    });

    it("should return correct dashboard for VALIDATOR", () => {
      expect(getDefaultDashboard("VALIDATOR")).toBe("/validator/submissions");
    });

    it("should return correct dashboard for KATUPARAN_CENTER_USER", () => {
      expect(getDefaultDashboard("KATUPARAN_CENTER_USER")).toBe("/katuparan/dashboard");
    });

    it("should return correct dashboard for BLGU_USER", () => {
      expect(getDefaultDashboard("BLGU_USER")).toBe("/blgu/dashboard");
    });
  });

  describe("Invalid Roles", () => {
    it("should return BLGU dashboard for undefined role", () => {
      expect(getDefaultDashboard(undefined)).toBe("/blgu/dashboard");
    });

    it("should return BLGU dashboard for unknown role", () => {
      expect(getDefaultDashboard("UNKNOWN_ROLE")).toBe("/blgu/dashboard");
    });

    it("should return BLGU dashboard for empty string role", () => {
      expect(getDefaultDashboard("")).toBe("/blgu/dashboard");
    });
  });

  describe("Return Value Format", () => {
    it("should return paths starting with /", () => {
      const roles = ["MLGOO_DILG", "ASSESSOR", "VALIDATOR", "BLGU_USER"];
      roles.forEach((role) => {
        const dashboard = getDefaultDashboard(role);
        expect(dashboard).toMatch(/^\//);
      });
    });

    it("should return strings", () => {
      expect(typeof getDefaultDashboard("MLGOO_DILG")).toBe("string");
    });

    it("should not return empty strings", () => {
      expect(getDefaultDashboard("ASSESSOR").length).toBeGreaterThan(0);
    });
  });

  describe("Consistency with Navigation", () => {
    it("should return a path that exists in MLGOO navigation", () => {
      const dashboard = getDefaultDashboard("MLGOO_DILG");
      const navPaths = mlgooNavigation.map((item) => item.href);
      expect(navPaths).toContain(dashboard);
    });

    it("should return a path that exists in BLGU navigation", () => {
      const dashboard = getDefaultDashboard("BLGU_USER");
      const navPaths = blguNavigation.map((item) => item.href);
      expect(navPaths).toContain(dashboard);
    });

    it("should return a path that exists in Assessor navigation", () => {
      const dashboard = getDefaultDashboard("ASSESSOR");
      const navPaths = assessorNavigation.map((item) => item.href);
      expect(navPaths).toContain(dashboard);
    });

    it("should return a path that exists in Validator navigation", () => {
      const dashboard = getDefaultDashboard("VALIDATOR");
      const navPaths = validatorNavigation.map((item) => item.href);
      expect(navPaths).toContain(dashboard);
    });

    it("should return a path that exists in Katuparan navigation", () => {
      const dashboard = getDefaultDashboard("KATUPARAN_CENTER_USER");
      const navPaths = katuparanNavigation.map((item) => item.href);
      expect(navPaths).toContain(dashboard);
    });
  });
});

describe("getPortalName", () => {
  describe("Valid Roles", () => {
    it("should return correct portal name for MLGOO_DILG", () => {
      expect(getPortalName("MLGOO_DILG")).toBe("Admin Portal");
    });

    it("should return correct portal name for ASSESSOR", () => {
      expect(getPortalName("ASSESSOR")).toBe("Assessor Portal");
    });

    it("should return correct portal name for VALIDATOR", () => {
      expect(getPortalName("VALIDATOR")).toBe("Validator Portal");
    });

    it("should return correct portal name for KATUPARAN_CENTER_USER", () => {
      expect(getPortalName("KATUPARAN_CENTER_USER")).toBe("Katuparan Center");
    });

    it("should return correct portal name for BLGU_USER", () => {
      expect(getPortalName("BLGU_USER")).toBe("Barangay Portal");
    });
  });

  describe("Invalid Roles", () => {
    it("should return Barangay Portal for undefined role", () => {
      expect(getPortalName(undefined)).toBe("Barangay Portal");
    });

    it("should return Barangay Portal for unknown role", () => {
      expect(getPortalName("UNKNOWN_ROLE")).toBe("Barangay Portal");
    });

    it("should return Barangay Portal for empty string role", () => {
      expect(getPortalName("")).toBe("Barangay Portal");
    });
  });

  describe("Return Value Format", () => {
    it("should return non-empty strings", () => {
      const roles = ["MLGOO_DILG", "ASSESSOR", "VALIDATOR", "BLGU_USER"];
      roles.forEach((role) => {
        const portalName = getPortalName(role);
        expect(typeof portalName).toBe("string");
        expect(portalName.length).toBeGreaterThan(0);
      });
    });

    it("should return human-readable names", () => {
      // Portal names should contain spaces or be properly formatted
      const name = getPortalName("MLGOO_DILG");
      expect(name).toMatch(/Portal|Center/);
    });

    it("should return capitalized names", () => {
      const roles = ["MLGOO_DILG", "ASSESSOR", "VALIDATOR"];
      roles.forEach((role) => {
        const name = getPortalName(role);
        // First character should be uppercase
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });
  });

  describe("Uniqueness", () => {
    it("should return unique portal names for different roles", () => {
      const names = [
        getPortalName("MLGOO_DILG"),
        getPortalName("ASSESSOR"),
        getPortalName("VALIDATOR"),
        getPortalName("KATUPARAN_CENTER_USER"),
        getPortalName("BLGU_USER"),
      ];
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
