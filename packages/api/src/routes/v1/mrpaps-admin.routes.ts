import { Router } from 'express';
import { z } from 'zod';
import { extractAdminToken, extractAdminRefreshToken, requireAdminAuth, requireDevAuth } from '../../middleware/admin-auth.js';
import {
  clearAllAdminSessionCookies,
  setAdminRefreshCookie,
  setAdminSessionCookie,
} from '../../lib/session-cookie.js';
import { requireUploadedFile, uploadSingle } from '../../middleware/upload.js';
import { authRateLimit, sessionRefreshRateLimit, uploadRateLimit } from '../../middleware/rate-limit.js';
import {
  adminLoginSchema,
  adminShippingQuoteSchema,
  adminListUsersQuerySchema,
  adminCreateUserSchema,
  adminUpdateUserRoleSchema,
  adminResetUserPasswordSchema,
  createDesignSchema,
  createProductSchema,
  createVariantSchema,
  mrpapsOrderStatusSchema,
  updateOrderStatusSchema,
  updateProductSchema,
  updateVariantAdminSchema,
} from '../../schemas/mrpaps.schema.js';
import * as catalog from '../../services/mrpaps-catalog.service.js';
import * as designsRepo from '../../db/mrpaps-designs.repository.js';
import * as templatesRepo from '../../db/mrpaps-garment-templates.repository.js';
import * as ordersRepo from '../../db/mrpaps-orders.repository.js';
import { changeOrderStatus } from '../../services/mrpaps-order-status.service.js';
import * as productsRepo from '../../db/mrpaps-products.repository.js';
import {
  normalizeAssetUrl,
  normalizeProductImages,
  replacePrimaryImage,
  resolveProductImages,
  resolveProductThumbnail,
} from '../../lib/product-images.js';
import * as adminAuth from '../../services/admin-auth.service.js';
import * as usersRepo from '../../db/mrpaps-users.repository.js';
import * as storage from '../../services/mrpaps-storage.service.js';
import { isEnviaConfigured } from '../../services/shipping/envia.client.js';
import { quoteShipping } from '../../services/shipping/shipping-quote.service.js';
import * as variantsAdmin from '../../services/mrpaps-variants-admin.service.js';
import { invalidateCatalogCache } from '../../services/cache-invalidation.service.js';
import * as mailTest from '../../services/mail-test.service.js';
import { translateProductContent } from '../../lib/translate.js';
import { BadRequestError } from '../../types/errors.js';
import {
  adminAnalyticsExportSchema,
  adminAnalyticsQuerySchema,
} from '../../schemas/admin-analytics.schema.js';
import { getAdminDashboard } from '../../services/admin-analytics.service.js';
import {
  buildAnalyticsCsv,
  buildAnalyticsPdf,
} from '../../services/admin-analytics-export.service.js';

export const v1MrpapsAdminRouter: Router = Router();

v1MrpapsAdminRouter.post('/auth/login', authRateLimit, async (req, res, next) => {
  try {
    const body = adminLoginSchema.parse(req.body);
    const { accessToken, refreshToken, user } = await adminAuth.loginAdmin(body.email, body.password);

    setAdminSessionCookie(res, accessToken);
    setAdminRefreshCookie(res, refreshToken);

    res.json({ data: { user } });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/auth/logout', async (req, res, next) => {
  try {
    const accessToken = extractAdminToken(req);
    const refreshToken = extractAdminRefreshToken(req);
    const userId = await adminAuth.resolveAdminLogoutUserId(accessToken, refreshToken);

    if (userId) {
      await adminAuth.revokeAdminSession(userId, refreshToken);
    } else if (refreshToken) {
      const { revokeAdminRefreshToken } = await import('../../services/admin-refresh-token.service.js');
      await revokeAdminRefreshToken(refreshToken);
    }

    clearAllAdminSessionCookies(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/auth/refresh', sessionRefreshRateLimit, async (req, res, next) => {
  try {
    const refreshToken = extractAdminRefreshToken(req);
    if (!refreshToken) {
      clearAllAdminSessionCookies(res);
      res.json({ data: null });
      return;
    }

    const result = await adminAuth.refreshAdminSession(refreshToken);
    if (!result) {
      clearAllAdminSessionCookies(res);
      res.json({ data: null });
      return;
    }

    setAdminSessionCookie(res, result.accessToken);
    setAdminRefreshCookie(res, result.refreshToken);
    res.json({ data: result.user });
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

v1MrpapsAdminRouter.get('/analytics/dashboard', async (req, res, next) => {
  try {
    const query = adminAnalyticsQuerySchema.parse(req.query);
    const data = await getAdminDashboard(query);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/analytics/export', async (req, res, next) => {
  try {
    const query = adminAnalyticsExportSchema.parse(req.query);
    const data = await getAdminDashboard(query);
    const stamp = `${data.period.from}_${data.period.to}`.replace(/[^\w-]/g, '');

    if (query.format === 'csv') {
      const csv = buildAnalyticsCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="mrpaps-ventas-${stamp}.csv"`,
      );
      res.send(csv);
      return;
    }

    const pdf = await buildAnalyticsPdf(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mrpaps-ventas-${stamp}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/mail/status', async (_req, res, next) => {
  try {
    const data = await mailTest.getMailStatus();
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/mail/test', async (req, res, next) => {
  try {
    const body = mailTest.adminMailTestSchema.parse(req.body ?? {});
    const data = await mailTest.runMailTest(body);
    res.status(data.ok ? 200 : 422).json({ data });
  } catch (err) {
    next(err);
  }
});

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

v1MrpapsAdminRouter.post('/uploads', uploadRateLimit, (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    void (async () => {
      try {
        const file = requireUploadedFile(req);
        const params = storage.parseUploadParams(req.body ?? {});

        const uploaded = await storage.uploadAsset(file.buffer, file.mimetype, {
          ...params,
          originalName: file.originalname,
        });

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

v1MrpapsAdminRouter.delete('/uploads', async (req, res, next) => {
  try {
    const pathParam = typeof req.query.path === 'string' ? req.query.path.trim() : '';
    if (!pathParam) {
      throw new BadRequestError('Indica ?path= con la ruta relativa del archivo.');
    }
    await storage.deleteAsset(pathParam);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/designs/upload', uploadRateLimit, (req, res, next) => {
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

        const designId = crypto.randomUUID();
        const uploaded = await storage.uploadAsset(file.buffer, file.mimetype, {
          kind: 'designs',
          designId,
          originalName: file.originalname,
        });

        const row = await designsRepo.createDesign({
          id: designId,
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
    const search = typeof req.query.search === 'string' && req.query.search.trim()
      ? req.query.search.trim()
      : undefined;
    const currencyRaw = typeof req.query.currency === 'string' ? req.query.currency.toUpperCase() : undefined;
    const currency = currencyRaw === 'MXN' || currencyRaw === 'USD' ? currencyRaw : undefined;
    const orders = await ordersRepo.listOrdersAdmin({
      status,
      paidOnly: true,
      search,
      currency,
    });
    res.json({
      data: orders.map((o) => ({
        publicId: o.public_id,
        orderNumber: o.order_number,
        status: o.status,
        paymentStatus: o.payment_status ?? null,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        currency: o.currency,
        market: o.currency === 'USD' ? 'us' : 'mx',
        shipCountryCode: o.ship_country_code,
        totalMxn: o.total_mxn !== null ? Number(o.total_mxn).toFixed(2) : null,
        totalUsd: o.total_usd !== null ? Number(o.total_usd).toFixed(2) : null,
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
          unitPriceUsd: i.unit_price_usd !== null ? Number(i.unit_price_usd).toFixed(2) : null,
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
    const row = await changeOrderStatus(
      req.params.publicId,
      body.status,
      {
        tracking_number: body.trackingNumber ?? null,
        tracking_url: body.trackingUrl ?? null,
        carrier: body.carrier ?? null,
        internal_notes: body.internalNotes ?? null,
      },
      { note: body.note, createdBy: req.adminUser!.email },
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
      retailPriceUsd: body.retailPriceUsd,
      stockQuantityMx: body.stockQuantityMx,
      stockQuantityUs: body.stockQuantityUs,
      designId: body.designId,
      garmentColorHex: body.garmentColorHex,
      status: body.status,
    });
    res.json({ data });
    void invalidateCatalogCache();
  } catch (err) {
    next(err);
  }
});

// ─── Fotos por color ──────────────────────────────────────────────────────────

async function syncProductCoverFromColorImages(productId: string): Promise<string | undefined> {
  const product = await productsRepo.getProductById(productId);
  if (!product) return undefined;

  const colorImages = await productsRepo.listColorImagesByProductId(productId);
  const cover = resolveProductThumbnail(product, colorImages);
  if (!cover) return product.slug;

  const gallery = resolveProductImages(product, colorImages);
  await productsRepo.updateProductAdmin(productId, {
    thumbnail_url: cover,
    gallery_urls: gallery.length > 0 ? gallery : [cover],
  });
  return product.slug;
}

v1MrpapsAdminRouter.get('/products/:productId/color-images', async (req, res, next) => {
  try {
    const rows = await productsRepo.listColorImagesByProductId(req.params.productId);
    res.json({
      data: rows.map((r) => ({
        color: r.color_label,
        imageUrl: normalizeAssetUrl(r.image_url),
      })),
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.put('/products/:productId/color-images/:colorLabel', async (req, res, next) => {
  try {
    const { imageUrl } = z.object({ imageUrl: z.string().min(1) }).parse(req.body);
    const normalizedUrl = normalizeAssetUrl(imageUrl);
    if (!normalizedUrl.startsWith('/uploads/')) {
      throw new BadRequestError('URL de imagen inválida.');
    }
    const row = await productsRepo.upsertColorImage(
      req.params.productId,
      decodeURIComponent(req.params.colorLabel),
      normalizedUrl,
    );
    const slug = await syncProductCoverFromColorImages(req.params.productId);
    res.json({
      data: { color: row.color_label, imageUrl: normalizeAssetUrl(row.image_url) },
    });
    void invalidateCatalogCache(slug);
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.delete('/products/:productId/color-images/:colorLabel', async (req, res, next) => {
  try {
    const product = await productsRepo.getProductById(req.params.productId);
    await productsRepo.deleteColorImage(
      req.params.productId,
      decodeURIComponent(req.params.colorLabel),
    );
    const slug = product ? await syncProductCoverFromColorImages(req.params.productId) : undefined;
    res.status(204).end();
    void invalidateCatalogCache(slug ?? product?.slug);
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
    await storage.deleteDesignAssets(req.params.id);
    await designsRepo.deleteDesign(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.get('/products', async (_req, res, next) => {
  try {
    const products = await productsRepo.listProductsAdmin();
    const variantsByProduct = await productsRepo.batchListVariantsByProductIds(
      products.map((p) => p.id),
    );
    const data = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      thumbnailUrl: p.thumbnail_url,
      status: p.status,
      category: p.category,
      variantCount: variantsByProduct.get(p.id)?.length ?? 0,
    }));
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
    const placeholder = storage.placeholderThumbnailUrl();
    const images = normalizeProductImages({
      thumbnailUrl: body.thumbnailUrl ?? placeholder,
      galleryUrls: body.galleryUrls,
    });
    const thumbnailUrl = images.thumbnail_url ?? placeholder;
    const galleryUrls = images.gallery_urls.length > 0 ? images.gallery_urls : [thumbnailUrl];

    // Best-effort auto-translation to English — never blocks the save if the
    // translation API is down or unconfigured (see lib/translate.ts).
    const description = body.description ?? '';
    const translation = await translateProductContent({ name: body.name, description });

    const row = await productsRepo.upsertProduct({
      slug,
      name: body.name,
      description,
      name_en: translation.name_en,
      description_en: translation.description_en,
      translated_at: translation.name_en || translation.description_en ? new Date().toISOString() : null,
      thumbnail_url: thumbnailUrl,
      gallery_urls: galleryUrls,
      status: body.status ?? 'active',
      template_id: body.templateId ?? null,
      composition: body.composition ?? {},
      default_garment_color: body.defaultGarmentColor ?? body.composition?.garmentColor ?? '#FFFFFF',
      category: body.category ?? 'camiseta',
    });

    if (body.retailPriceMxn) {
      await productsRepo.upsertVariant({
        product_id: row.id,
        sku: `MRP-${slug.toUpperCase().replace(/-/g, '').slice(0, 24)}`,
        size_label: 'Única',
        color_label: 'Estándar',
        retail_price_mxn: body.retailPriceMxn,
        retail_price_usd: body.retailPriceUsd ?? null,
        stock_quantity_mx: 0,
        stock_quantity_us: 0,
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
        category: row.category,
      },
    });
    void invalidateCatalogCache(row.slug);
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/products/:productId', async (req, res, next) => {
  try {
    const body = updateProductSchema.parse(req.body);
    const patch: Parameters<typeof productsRepo.updateProductAdmin>[1] = {
      name: body.name,
      slug: body.slug,
      description: body.description,
      status: body.status,
      template_id: body.templateId,
      composition: body.composition,
      default_garment_color: body.defaultGarmentColor,
      category: body.category,
    };

    let existing: Awaited<ReturnType<typeof productsRepo.getProductById>> = null;

    if (body.galleryUrls !== undefined) {
      const images = normalizeProductImages({
        galleryUrls: body.galleryUrls,
        thumbnailUrl: body.thumbnailUrl,
      });
      patch.gallery_urls = images.gallery_urls;
      if (images.thumbnail_url) patch.thumbnail_url = images.thumbnail_url;
    } else if (body.thumbnailUrl !== undefined) {
      existing = await productsRepo.getProductById(req.params.productId);
      const currentGallery = existing ? resolveProductImages(existing) : [];
      patch.gallery_urls = replacePrimaryImage(currentGallery, body.thumbnailUrl);
      patch.thumbnail_url = body.thumbnailUrl;
    }

    // Manual English overrides — an explicit admin correction always wins and
    // locks the field so future auto-translations don't clobber it.
    if (body.nameEnOverride !== undefined) {
      patch.name_en = body.nameEnOverride;
      patch.name_en_is_manual = true;
    } else if (body.nameEnIsManual !== undefined) {
      patch.name_en_is_manual = body.nameEnIsManual;
    }

    if (body.descriptionEnOverride !== undefined) {
      patch.description_en = body.descriptionEnOverride;
      patch.description_en_is_manual = true;
    } else if (body.descriptionEnIsManual !== undefined) {
      patch.description_en_is_manual = body.descriptionEnIsManual;
    }

    // Re-translate automatically when name/description changed and the field
    // isn't locked by a manual override. Best-effort — see lib/translate.ts.
    if (body.name !== undefined || body.description !== undefined) {
      existing = existing ?? (await productsRepo.getProductById(req.params.productId));
      const nameLocked = patch.name_en_is_manual ?? existing?.name_en_is_manual ?? false;
      const descriptionLocked = patch.description_en_is_manual ?? existing?.description_en_is_manual ?? false;

      if ((!nameLocked && body.name !== undefined) || (!descriptionLocked && body.description !== undefined)) {
        const translation = await translateProductContent({
          name: body.name ?? existing?.name ?? '',
          description: body.description ?? existing?.description ?? '',
        });
        if (!nameLocked && translation.name_en !== null) patch.name_en = translation.name_en;
        if (!descriptionLocked && translation.description_en !== null) {
          patch.description_en = translation.description_en;
        }
        if (translation.name_en || translation.description_en) {
          patch.translated_at = new Date().toISOString();
        }
      }
    }

    const row = await productsRepo.updateProductAdmin(req.params.productId, patch);
    res.json({
      data: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
      },
    });
    void invalidateCatalogCache(row.slug);
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
      retailPriceUsd: body.retailPriceUsd,
      designId: body.designId,
      garmentColorHex: body.garmentColorHex,
    });
    res.status(201).json({ data });
    void invalidateCatalogCache();
  } catch (err) {
    next(err);
  }
});

// ─── Gestión de usuarios (solo dev) ──────────────────────────────────────────

function mapUserAdmin(u: usersRepo.UserAdminRow) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    phone: u.phone,
    role: u.role,
    emailVerifiedAt: u.email_verified_at,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

v1MrpapsAdminRouter.get('/users', requireDevAuth, async (req, res, next) => {
  try {
    const query = adminListUsersQuerySchema.parse(req.query);
    const { rows, total } = await usersRepo.listUsers({
      role: query.role,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    });
    res.json({
      data: rows.map(mapUserAdmin),
      meta: { total, limit: query.limit, offset: query.offset },
    });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.post('/users', requireDevAuth, async (req, res, next) => {
  try {
    const body = adminCreateUserSchema.parse(req.body);
    const password_hash = await adminAuth.hashPassword(body.password);
    const user = await usersRepo.createPrivilegedUser({
      email: body.email,
      full_name: body.fullName,
      password_hash,
      role: body.role,
    });
    res.status(201).json({ data: mapUserAdmin(user) });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.patch('/users/:userId/role', requireDevAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId as string;

    if (userId === req.adminUser!.id) {
      res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      return;
    }

    const body = adminUpdateUserRoleSchema.parse(req.body);
    const user = await usersRepo.updateUserRole(userId, body.role);
    res.json({ data: mapUserAdmin(user) });
  } catch (err) {
    next(err);
  }
});

/** Diagnóstico de cuenta: muestra estado del usuario sin exponer el hash. */
v1MrpapsAdminRouter.get('/users/:userId', requireDevAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId as string;
    const user = await usersRepo.findUserById(userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({
      data: {
        ...mapUserAdmin(user),
        hasPasswordHash: Boolean(user.password_hash),
        emailVerifiedAt: user.email_verified_at ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** Resetear contraseña de cualquier usuario (invalida sesiones activas). */
v1MrpapsAdminRouter.patch('/users/:userId/password', requireDevAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId as string;
    const body = adminResetUserPasswordSchema.parse(req.body);
    const passwordHash = await adminAuth.hashPassword(body.password);
    const user = await usersRepo.updateUserPassword(userId, passwordHash);
    res.json({ data: mapUserAdmin(user), message: 'Contraseña actualizada. Las sesiones activas han sido invalidadas.' });
  } catch (err) {
    next(err);
  }
});

v1MrpapsAdminRouter.delete('/users/:userId', requireDevAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId as string;

    if (userId === req.adminUser!.id) {
      res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
      return;
    }

    await usersRepo.deleteUser(userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
