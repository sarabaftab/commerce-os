import { z } from "zod";

export const membershipRoleSchema = z.enum(["owner", "admin", "staff"]);
