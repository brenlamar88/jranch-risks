import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FacilityAccess {
  accessibleFacilities: Array<{ id: string; name: string }>;
  userFacility: { id: string; name: string } | null;
  hasMultiFacilityAccess: boolean;
  loading: boolean;
}

export const useFacilityAccess = (): FacilityAccess => {
  const [accessibleFacilities, setAccessibleFacilities] = useState<Array<{ id: string; name: string }>>([]);
  const [userFacility, setUserFacility] = useState<{ id: string; name: string } | null>(null);
  const [hasMultiFacilityAccess, setHasMultiFacilityAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFacilityAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get current user's facility
      const { data: userData } = await supabase
        .from("users")
        .select("company_id, companies(id, name)")
        .eq("id", user.id)
        .single();

      if (userData?.companies) {
        const company = userData.companies as { id: string; name: string };
        setUserFacility(company);

        // Check if user's facility is a parent in the hierarchy
        const { data: childFacilities } = await supabase
          .from("facility_access")
          .select("child_id, companies!facility_access_child_id_fkey(id, name)")
          .eq("parent_id", company.id);

        if (childFacilities && childFacilities.length > 0) {
          // User has multi-facility access (Corporate user)
          const facilities = [
            company,
            ...childFacilities.map(f => f.companies as { id: string; name: string })
          ].filter(Boolean);
          setAccessibleFacilities(facilities);
          setHasMultiFacilityAccess(true);
        } else {
          // Single facility access
          setAccessibleFacilities([company]);
          setHasMultiFacilityAccess(false);
        }
      }

      setLoading(false);
    };

    checkFacilityAccess();
  }, []);

  return { accessibleFacilities, userFacility, hasMultiFacilityAccess, loading };
};
