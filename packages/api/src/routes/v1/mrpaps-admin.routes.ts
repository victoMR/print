import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import { requireUploadedFile, uploadSingle } from '../../middleware/upload.js';
import {
  adminLoginSchema,
  adminShippingQuoteSchema,
  createDesignSchema,
  createProductSchema,
  createVariantSchema,
  mrpapsOrderStatusSchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateVariantAdminSchema,
} from '../../schemas/mrpaps.schema.js';
import * as catalog from '../../services/mrpaps-catalog.service.js';
import * as checkout from '../../services/mrpaps-checkout.service.js';
import * as designsRepo from '../../db/mrpaps-designs.repository.js';
import * as templatesRepo from '../../db/mrpaps-garment-templates.repository.js';
import * as ordersRepo from '../../db/mrpaps-orders.repository.js';
import * as productsRepo from '../../db/mrpaps-products.repository.js';
import * as adminAuth from '../../services/admin-auth.service.js';
import * as storage from '../../services/mrpaps-storage.service.js';
import { isEnviaConfigured } from '../../services/shipping/envia.client.js';
import { quoteShipping } from '../../services/shipping/shipping-quote.service.js';
import * as variantsAdmin from '../../services/mrpaps-variants-admin.service.js';

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

function mapTemplate(row: Awaited<ReturnType<typeof templatesRepo.listActiveTemplates>>[number]) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    garmentType: row.garment_type,
    views: row.views,
    sortOrder: row.sort_order,
  };
}

v1MrpapsAdminRouter.get('/templates', async (_req, res, next) => {
  try {
    const rows = await templatesRepo.listActiveTemplates();
    res.json({ data: rows.map(mapTemplate) });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/uploads', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    void (async () => {
      try {
        const file = requireUploadedFile(req);
        const folderRaw = typeof req.body?.folder === 'string' ? req.body.folder : 'designs';
        const folder = folderRaw === 'previews' || folderRaw === 'exports' ? folderRaw : 'designs';

        const uploaded = await storage.uploadAsset(
          file.buffer,
          file.mimetype,
          folder,
          file.originalname,
        );

        res.status(201).json({
          data: {
            url: uploaded.url,
            path: uploaded.path,
            mime: uploaded.mime,
            size: uploaded.size,
          },
        });
      } catch (e) {
        next(e);
      }
    })();
  });
});

v1MrpapsAdminRouter.post('/designs/upload', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    void (async () => {
      try {
        const file = requireUploadedFile(req);
        const name = typeof req.body?.name === 'string' && req.body.name.trim()
          ? req.body.name.trim()
          : file.originalname.replace(/\.[^.]+$/, '') || 'Diseño';
        const description = typeof req.body?.description === 'string'
          ? req.body.description.trim() || undefined
          : undefined;

        const uploaded = await storage.uploadAsset(
          file.buffer,
          file.mimetype,
          'designs',
          file.originalname,
        );

        const row = await designsRepo.createDesign({
          name,
          description: description ?? null,
          file_url: uploaded.url,
          thumbnail_url: uploaded.url,
          metadata: {
            storagePath: uploaded.path,
            mime: uploaded.mime,
            size: uploaded.size,
            originalName: file.originalname,
          },
        });

        res.status(201).json({
          data: {
            id: row.id,
            name: row.name,
            description: row.description,
            fileUrl: row.file_url,
            thumbnailUrl: row.thumbnail_url,
            tags: row.tags,
            metadata: row.metadata,
            createdAt: row.created_at,
          },
        });
      } catch (e) {
        next(e);
      }
    })();
  });
});

v1MrpapsAdminRouter.post('/shipping/quote', async (req, res, next) => {
  try {
    const body = adminShippingQuoteSchema.parse(req.body);
    const result = await quoteShipping(
      {
        items: [{ variantId: '00000000-0000-0000-0000-000000000001', quantity: body.itemCount }],
        address: body.address,
      },
      { forCustomer: false },
    );
    res.json({
      data: {
        ...result,
        enviaConfigured: isEnviaConfigured(),
      },
    });
  } catch (err) {
    next(err);
  }
});

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
          thumbnailUrl: i.thumbnail_url,
          printFileUrl: i.print_file_url,
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/orders/:publicId', async (req, res, next) => {
  try {
    const { getAdminOrderDetail } = await import('../../services/mrpaps-order-detail.service.js');
    const data = await getAdminOrderDetail(req.params.publicId);
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

v1MrpapsAdminRouter.patch('/variants/:variantId', async (req, res, next) => {
  try {
    const body = updateVariantAdminSchema.parse(req.body);
    const data = await variantsAdmin.updateVariantAdmin(req.params.variantId, {
      sku: body.sku,
      sizeLabel: body.sizeLabel,
      colorLabel: body.colorLabel,
      retailPriceMxn: body.retailPriceMxn,
      designId: body.designId,
      garmentColorHex: body.garmentColorHex,
      status: body.status,
    });
    res.json({ data });
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
        metadata: d.metadata,
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
      metadata: body.metadata,
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
    const data = await variantsAdmin.getAdminProductWithVariants(req.params.productId);
    res.json({ data });
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
      template_id: body.templateId ?? null,
      composition: body.composition ?? {},
      default_garment_color: body.defaultGarmentColor ?? body.composition?.garmentColor ?? '#FFFFFF',
    });

    if (body.retailPriceMxn) {
      await productsRepo.upsertVariant({
        product_id: row.id,
        sku: `MRP-${slug.toUpperCase().replace(/-/g, '').slice(0, 24)}`,
        size_label: 'Única',
        color_label: 'Estándar',
        retail_price_mxn: body.retailPriceMxn,
        stock_quantity: 0,
        design_id: null,
        garment_color_hex: body.defaultGarmentColor ?? '#FFFFFF',
      });
    }

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
      template_id: body.templateId,
      composition: body.composition,
      default_garment_color: body.defaultGarmentColor,
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
    const data = await variantsAdmin.createVariantAdmin(req.params.productId, {
      sku: body.sku,
      sizeLabel: body.sizeLabel,
      colorLabel: body.colorLabel,
      retailPriceMxn: body.retailPriceMxn,
      designId: body.designId,
      garmentColorHex: body.garmentColorHex,
    });
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});
