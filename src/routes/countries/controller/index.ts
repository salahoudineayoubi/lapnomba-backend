import { Request, Response } from "express";
import { countries } from "../data_countries";

// Récupérer la liste des pays
export function getCountries(_req: Request, res: Response) {
  res.json(countries);
}