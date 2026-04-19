// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react";

const rules = {
	/**
	 * Welcome to Instant's permission system!
	 * Right now your rules are empty. To start filling them in, check out the docs:
	 * https://www.instantdb.com/docs/permissions
	 *
	 * Here's an example to give you a feel:
	 * posts: {
	 *   allow: {
	 *     view: "true",
	 *     create: "isOwner",
	 *     update: "isOwner",
	 *     delete: "isOwner",
	 *   },
	 *   bind: ["isOwner", "auth.id != null && auth.id == data.ownerId"],
	 * },
	 */
	tenants: {
	bind: ["ownedCount", "size(data.owner.tenants)"],
	allow: {
		create: "ownedCount < 1", 
  	},
},
} satisfies InstantRules;

export default rules;
