import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import {
  adminLoginSchema,
  createDesignSchema,
  createProductSchema,
  createVariantSchema,
  mrpapsOrderStatusSchema,
  updateInventorySchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateVariantAdminSchema,
} from '../../schemas/mrpaps.schema.js';
import * as catalog from '../../services/mrpaps-catalog.service.js';
import * as checkout from '../../services/mrpaps-checkout.service.js';
import * as designsRepo from '../../db/mrpaps-designs.repository.js';
import * as ordersRepo from '../../db/mrpaps-orders.repository.js';
import * as productsRepo from '../../db/mrpaps-products.repository.js';
import * as adminAuth from '../../services/admin-auth.service.js';

export const v1MrpapsAdminRouter: Router = Router();

v1MrpapsAdminRouter.post('/auth/login', async (req, res, next) => {
  try {
    const body = adminLoginSchema.parse(req.body);
    const data = await adminAuth.loginAdmin(body.email, body.password);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/auth/me', requireAdminAuth, async (req, res) => {
  res.json({
    data: {
      id: req.adminUser!.id,
      email: req.adminUser!.email,
      role: req.adminUser!.role,
    },
  });
});

v1MrpapsAdminRouter.use(requireAdminAuth);

v1MrpapsAdminRouter.get('/orders', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string'
      ? mrpapsOrderStatusSchema.safeParse(req.query.status).data
      : undefined;

    const orders = await ordersRepo.listOrdersAdmin({ status });
    res.json({
      data: orders.map((o) => ({
        publicId: o.public_id,
        orderNumber: o.order_number,
        status: o.status,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        totalMxn: Number(o.total_mxn).toFixed(2),
        shippingLabel: o.shipping_label,
        trackingNumber: o.tracking_number,
        trackingUrl: o.tracking_url,
        carrier: o.carrier,
        orderedAt: o.ordered_at,
        printedAt: o.printed_at,
        shippedAt: o.shipped_at,
        itemCount: o.items.length,
        items: o.items.map((i) => ({
          productName: i.product_name,
          variantLabel: i.variant_label,
          sku: i.sku,
          quantity: i.quantity,
          unitPriceMxn: Number(i.unit_price_mxn).toFixed(2),
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/orders/:publicId', async (req, res, next) => {
  try {
    const data = await checkout.getPublicOrder(req.params.publicId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/orders/:publicId/status', async (req, res, next) => {
  try {
    const body = updateOrderStatusSchema.parse(req.body);
    const row = await ordersRepo.updateOrderStatus(
      req.params.publicId,
      body.status,
      {
        tracking_number: body.trackingNumber ?? null,
        tracking_url: body.trackingUrl ?? null,
        carrier: body.carrier ?? null,
        internal_notes: body.internalNotes ?? null,
      },
      { note: body.note, createdBy: 'admin' },
    );
    res.json({
      data: {
        publicId: row.public_id,
        status: row.status,
        trackingNumber: row.tracking_number,
        trackingUrl: row.tracking_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/inventory', async (_req, res, next) => {
  try {
    const data = await catalog.listInventoryAdmin();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/inventory/:variantId', async (req, res, next) => {
  try {
    const body = updateInventorySchema.parse(req.body);
    const row = await productsRepo.updateVariantStock(req.params.variantId, body.stockQuantity);
    res.json({
      data: {
        variantId: row.id,
        stockQuantity: row.stock_quantity,
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/variants/:variantId', async (req, res, next) => {
  try {
    const body = updateVariantAdminSchema.parse(req.body);
    const row = await productsRepo.updateVariantAdmin(req.params.variantId, {
      retail_price_mxn: body.retailPriceMxn,
      stock_quantity: body.stockQuantity,
      design_id: body.designId,
      status: body.status,
    });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/designs', async (_req, res, next) => {
  try {
    const rows = await designsRepo.listDesigns();
    res.json({
      data: rows.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        fileUrl: d.file_url,
        thumbnailUrl: d.thumbnail_url,
        tags: d.tags,
        createdAt: d.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/designs', async (req, res, next) => {
  try {
    const body = createDesignSchema.parse(req.body);
    const row = await designsRepo.createDesign({
      name: body.name,
      description: body.description,
      file_url: body.fileUrl,
      thumbnail_url: body.thumbnailUrl,
      tags: body.tags,
    });
    res.status(201).json({
      data: {
        id: row.id,
        name: row.name,
        fileUrl: row.file_url,
        thumbnailUrl: row.thumbnail_url,
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.delete('/designs/:id', async (req, res, next) => {
  try {
    await designsRepo.deleteDesign(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await productsRepo.listProductsAdmin();
    const data = await Promise.all(
      products.map(async (p) => {
        const variants = await productsRepo.listVariantsByProductIdAdmin(p.id);
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          thumbnailUrl: p.thumbnail_url,
          status: p.status,
          variantCount: variants.length,
        };
      }),
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/products/:productId', async (req, res, next) => {
  try {
    const product = await productsRepo.getProductById(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    const variants = await productsRepo.listVariantsByProductIdAdmin(product.id);
    res.json({
      data: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        thumbnailUrl: product.thumbnail_url,
        status: product.status,
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          size: v.size_label,
          color: v.color_label,
          retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
          stockQuantity: v.stock_quantity,
          status: v.status,
          designId: v.design_id,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/products', async (req, res, next) => {
  try {
    const body = createProductSchema.parse(req.body);
    const slug = body.slug ?? catalog.slugify(body.name);
    const row = await productsRepo.upsertProduct({
      slug,
      name: body.name,
      description: body.description ?? '',
      thumbnail_url: body.thumbnailUrl,
      status: body.status ?? 'active',
    });
    res.status(201).json({
      data: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        thumbnailUrl: row.thumbnail_url,
        status: row.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/products/:productId', async (req, res, next) => {
  try {
    const body = updateProductSchema.parse(req.body);
    const row = await productsRepo.updateProductAdmin(req.params.productId, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      thumbnail_url: body.thumbnailUrl,
      status: body.status,
    });
    res.json({
      data: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/products/:productId/variants', async (req, res, next) => {
  try {
    const body = createVariantSchema.parse(req.body);
    const product = await productsRepo.getProductById(req.params.productId);
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    const row = await productsRepo.upsertVariant({
      product_id: product.id,
      sku: body.sku,
      size_label: body.sizeLabel,
      color_label: body.colorLabel,
      retail_price_mxn: body.retailPriceMxn,
      stock_quantity: body.stockQuantity,
      design_id: body.designId ?? null,
    });
    res.status(201).json({
      data: {
        id: row.id,
        sku: row.sku,
        size: row.size_label,
        color: row.color_label,
        retailPriceMxn: Number(row.retail_price_mxn).toFixed(2),
        stockQuantity: row.stock_quantity,
      },
    });
  } catch (err) {
    next(err);
  }
});
