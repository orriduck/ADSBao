"use client";

import { createContext, useContext } from "react";

export const MapContext = createContext(null);

export const useMapInstance = () => useContext(MapContext);
