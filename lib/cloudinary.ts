const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;

/**
 * Builds a Cloudinary delivery URL, optionally applying the same
 * watermark overlay currently added to article images.
 *
 * Replace `naijatoday_watermark` below with the actual public_id of
 * your watermark asset in Cloudinary.
 */
export function cloudinaryUrl(
  publicId: string,
  opts: { width?: number; height?: number; watermark?: boolean } = {}
) {
  const { width, height, watermark = true } = opts;

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push('c_fill');

  if (watermark) {
    transforms.push('l_naijatoday_watermark,g_south_east,x_10,y_10,o_70');
  }

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms.join(
    ','
  )}/${publicId}`;
}
