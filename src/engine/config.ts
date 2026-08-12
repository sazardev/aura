import type { AppConfig } from '@/engine/types'

import configData from '@/data/config.json'
import { appConfigSchema } from '@/engine/schemas'

export const CONFIG: AppConfig = appConfigSchema.parse(configData)
