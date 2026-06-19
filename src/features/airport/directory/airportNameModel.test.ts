import assert from "node:assert/strict";

import { applyOurAirportsAirport, chooseAirportName } from "./airportNameModel";

// chooseAirportName: OurAirports wins when present; OpenAIP is never a name fallback.
{
  assert.equal(
    chooseAirportName(
      "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO",
      "General Edward Lawrence Logan International Airport",
    ),
    "General Edward Lawrence Logan International Airport",
  );
}

{
  assert.equal(chooseAirportName("KBOS", ""), "");
  assert.equal(chooseAirportName("KBOS", "   "), "");
  assert.equal(chooseAirportName("KBOS", null), "");
}

// applyOurAirportsAirport: overrides the truncated name and fills an empty city.
{
  const airport = {
    icao: "KBOS",
    name: "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO",
    city: "",
    country: "US",
  };
  const merged = applyOurAirportsAirport(airport, {
    name: "General Edward Lawrence Logan International Airport",
    city: "Boston",
  });
  assert.equal(merged.name, "General Edward Lawrence Logan International Airport");
  assert.equal(merged.city, "Boston");
  // Untouched fields survive.
  assert.equal(merged.country, "US");
  assert.equal(merged.icao, "KBOS");
}

{
  // A city OpenAIP already provided is never clobbered by the override.
  const merged = applyOurAirportsAirport(
    { icao: "KBOS", name: "OLD", city: "Existing City" },
    { name: "New Name", city: "Boston" },
  );
  assert.equal(merged.city, "Existing City");
  assert.equal(merged.name, "New Name");
}

{
  // No override -> name is blank instead of falling back to OpenAIP.
  const airport = { icao: "KBOS", name: "GENERAL EDWARD LAWRENCE LOGAN INTERNATIO" };
  assert.equal(applyOurAirportsAirport(airport, null).name, "");
  assert.equal(applyOurAirportsAirport(airport, undefined).name, "");
}

{
  // Null airport is tolerated.
  assert.equal(applyOurAirportsAirport(null, { name: "x" }), null);
}

console.log("airportNameModel.test.ts passed");
