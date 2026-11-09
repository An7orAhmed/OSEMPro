// @ts-check
import { module } from "@prisma/composer";
import osemproService from "./service.mjs";

export default module("osempro", ({ provision }) => {
  provision(osemproService);
});
