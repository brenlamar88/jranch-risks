// Type helper to ensure Supabase types are properly recognized
import type { Database } from "@/integrations/supabase/types";

export type Tables = Database["public"]["Tables"];
export type Risks = Tables["risks"]["Row"];
export type Users = Tables["users"]["Row"];
export type Companies = Tables["companies"]["Row"];
export type Departments = Tables["departments"]["Row"];
export type ServiceLines = Tables["service_lines"]["Row"];
export type FocusAreas = Tables["focus_areas"]["Row"];
export type UserRoles = Tables["user_roles"]["Row"];
export type Notifications = Tables["notifications"]["Row"];
export type Scorecards = Tables["scorecards"]["Row"];
