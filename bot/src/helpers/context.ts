import { Context } from "telegraf";
import { User } from "../schemas/User";

export interface SuperDuperUpgradedContext extends Context {
  newUser: boolean;
  user: User;
}