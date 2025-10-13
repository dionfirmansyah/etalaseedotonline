/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import ProductList from "@/components/shared/productlist";
import TenantInfo from "@/components/shared/tenant-info";
import { db, type Tenant } from "@/lib/db";

export default function HomeSubdomainPage({ data }: { data: Tenant }) {
	const { products, name, description, info, owner, categories } = data;

	return (
		<div className="max-w-lg mx-auto">
			<section
				className="flex min-h-screen items-center justify-center"
				id="tenant-info"
			>
				<TenantInfo name={name} info={info!} description={description!} />
			</section>

			<section
				className="flex min-h-screen flex-col px-4 py-4 gap-4 pb-4"
				id="products"
			>
				<ProductList products={products} categories={categories} />
			</section>
		</div>
	);
}
