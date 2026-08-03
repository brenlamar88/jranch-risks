-- Refresh database types by adding a comment
COMMENT ON TABLE public.risks IS 'Risk action plans and tracking';
COMMENT ON TABLE public.users IS 'User profiles and information';
COMMENT ON TABLE public.companies IS 'Company entities';
COMMENT ON TABLE public.departments IS 'Department entities';
COMMENT ON TABLE public.service_lines IS 'Service line entities';
COMMENT ON TABLE public.focus_areas IS 'Focus area entities';
COMMENT ON TABLE public.user_roles IS 'User role assignments';
COMMENT ON TABLE public.notifications IS 'User notifications';
COMMENT ON TABLE public.scorecards IS 'Department scorecards';