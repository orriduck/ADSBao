-- Normalize imported SpotterGuide display titles.
--
-- Spot numbers are stored separately in spot_number, so UI titles should not
-- repeat source prefixes like "Spot #1 -".

update spotter.spotter_locations
set title = btrim(regexp_replace(title, '^\s*spot\s*#\s*[0-9]+\s*[-–—:]\s*', '', 'i'))
where title ~* '^\s*spot\s*#\s*[0-9]+\s*[-–—:]';
