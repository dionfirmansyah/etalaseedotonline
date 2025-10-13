import { db } from "@/lib/db";
import { id } from "@instantdb/react";

export const useTenant = () => {
	const createNewTenant = async (
		name: string,
		subdomain: string,
		userId: string,
		plan: string = "daf24b9c-9252-41fd-8397-1cb9b5f11d39",
		role: string = "owner",
	) => {
		try {
			// cek apakah user sudah punya tenant
			const { data } = await db.queryOnce({
				tenants: { $: { where: { owner: userId }, limit: 1 } },
			});

			if (data.tenants?.length) {
				return;
			}

			const tenantId = id();

			await db.transact([
				db.tx.tenants[tenantId]
					.create({
						name,
						subdomain: subdomain,
						createdAt: new Date(),
					})
					.link({ owner: userId }),
				db.tx.tenant_members[id()]
					.create({
						role,
					})
					.link({ tenant: tenantId, memberships: userId }),
			]);
		} catch (error) {
			throw new Error("Invalid Create New Tenant");
		} finally {
			// router.push(`${protocol}://${subdomain}.${rootDomain}/dashboard`);
		}
	};

	return {
		createNewTenant,
	};
};
