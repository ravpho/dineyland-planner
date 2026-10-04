import { parseCatalog, type Catalog } from '../domain/catalog'
import raw from './catalog.json'

/** The bundled catalog, validated once at start-up. */
export const catalog: Catalog = parseCatalog(raw)
