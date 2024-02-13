import { randomBytes } from 'crypto'

export const createSecret = () => randomBytes(64).toString('hex')