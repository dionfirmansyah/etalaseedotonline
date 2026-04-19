// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    categories: i.entity({
      icon: i.any().optional(),
      name: i.string(),
      slug: i.string().indexed(),
    }),
    plans: i.entity({
      features: i.any(),
      max_products: i.number(),
      name: i.string().indexed(),
      price: i.number(),
    }),
    product_images: i.entity({
      alt: i.string().optional(),
      url: i.string(),
    }),
    products: i.entity({
      created_at: i.date(),
      deleted_at: i.date().optional(),
      descriptions: i.string().optional(),
      isActive: i.boolean(),
      name: i.string(),
      price: i.number(),
      slug: i.string().unique().indexed(),
      stock: i.number().optional(),
    }),
    subscriptions: i.entity({
      end_date: i.date().optional(),
      isPaid: i.boolean(),
      payment_method: i.string(),
      price: i.number(),
      renewal: i.boolean(),
      start_date: i.date(),
    }),
    tenant_info: i.entity({
      favicon: i.string().optional(),
      gateway_api_key: i.any().optional(),
      google_map: i.any().optional(),
      instagram: i.string().optional(),
      location: i.string().optional(),
      logo: i.string().optional(),
      photo: i.string().optional(),
      theme: i.string().optional(),
      tiktok: i.string().optional(),
      whatsapp: i.string().optional(),
    }),
    tenant_members: i.entity({
      role: i.string(),
    }),
    tenants: i.entity({
      createdAt: i.date(),
      description: i.string().optional(),
      is_active: i.boolean().optional(),
      is_public: i.boolean(),
      name: i.string().unique(),
      subdomain: i.string().unique().indexed(),
    }),
    transaction_items: i.entity({
      price: i.number(),
      qty: i.number(),
    }),
    transactions: i.entity({
      created_at: i.date(),
      invoice_number: i.string(),
      payment_method: i.string().optional(),
      status: i.string().indexed(),
      total: i.number(),
    }),
    user_profiles: i.entity({
      avatar_url: i.string().optional(),
      bio: i.string().optional(),
      created_at: i.date(),
      instagram: i.string().optional(),
      location: i.string().optional(),
      name: i.string(),
      tiktok: i.string().optional(),
      whatsapp: i.string().optional(),
    }),
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    categoriesTenant: {
      forward: {
        on: "categories",
        has: "one",
        label: "tenant",
        required: true,
        onDelete: "cascade",
      },
      reverse: {
        on: "tenants",
        has: "many",
        label: "categories",
      },
    },
    product_imagesProduct: {
      forward: {
        on: "product_images",
        has: "one",
        label: "product",
        onDelete: "cascade",
      },
      reverse: {
        on: "products",
        has: "many",
        label: "product_images",
      },
    },
    productsCategory: {
      forward: {
        on: "products",
        has: "one",
        label: "category",
        required: true,
      },
      reverse: {
        on: "categories",
        has: "many",
        label: "products",
      },
    },
    productsTenant: {
      forward: {
        on: "products",
        has: "one",
        label: "tenant",
        required: true,
        onDelete: "cascade",
      },
      reverse: {
        on: "tenants",
        has: "many",
        label: "products",
      },
    },
    subscriptions$users: {
      forward: {
        on: "subscriptions",
        has: "one",
        label: "$users",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "subscriptions",
      },
    },
    subscriptionsPlan: {
      forward: {
        on: "subscriptions",
        has: "one",
        label: "plan",
        required: true,
      },
      reverse: {
        on: "plans",
        has: "one",
        label: "subscription",
      },
    },
    tenant_infoTenant: {
      forward: {
        on: "tenant_info",
        has: "one",
        label: "tenant",
        required: true,
        onDelete: "cascade",
      },
      reverse: {
        on: "tenants",
        has: "one",
        label: "info",
      },
    },
    tenant_membersMemberships: {
      forward: {
        on: "tenant_members",
        has: "one",
        label: "memberships",
        required: true,
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "tenant_members",
      },
    },
    tenant_membersTenant: {
      forward: {
        on: "tenant_members",
        has: "many",
        label: "tenant",
        required: true,
      },
      reverse: {
        on: "tenants",
        has: "one",
        label: "tenant_members",
        onDelete: "cascade",
      },
    },
    tenantsOwner: {
      forward: {
        on: "tenants",
        has: "one",
        label: "owner",
        required: true,
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "tenants",
      },
    },
    transaction_itemsProduct: {
      forward: {
        on: "transaction_items",
        has: "one",
        label: "product",
        required: true,
        onDelete: "cascade",
      },
      reverse: {
        on: "products",
        has: "many",
        label: "transaction_items",
      },
    },
    transaction_itemsTenant: {
      forward: {
        on: "transaction_items",
        has: "many",
        label: "tenant",
        required: true,
      },
      reverse: {
        on: "tenants",
        has: "one",
        label: "transaction_items",
        onDelete: "cascade",
      },
    },
    transactionsItems: {
      forward: {
        on: "transactions",
        has: "many",
        label: "items",
        required: true,
      },
      reverse: {
        on: "transaction_items",
        has: "one",
        label: "transaction",
        onDelete: "cascade",
      },
    },
    transactionsTenant: {
      forward: {
        on: "transactions",
        has: "many",
        label: "tenant",
        required: true,
      },
      reverse: {
        on: "tenants",
        has: "one",
        label: "transactions",
        onDelete: "cascade",
      },
    },
    transactionsUser: {
      forward: {
        on: "transactions",
        has: "many",
        label: "user",
        required: true,
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "transactions",
      },
    },
    user_profiles$users: {
      forward: {
        on: "user_profiles",
        has: "one",
        label: "$users",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "user_profiles",
      },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
