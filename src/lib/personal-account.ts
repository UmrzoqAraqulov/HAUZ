export const PERSONAL_ACCOUNT_ROLES = ['property_owner', 'realtor'] as const

export type PersonalAccountRole = (typeof PERSONAL_ACCOUNT_ROLES)[number]

export const ROLE_LABELS: Record<PersonalAccountRole, string> = {
  property_owner: 'Property Owner',
  realtor: 'Realtor',
}

// The shape the Function returns (describe() in functions/personal-account/src/handlers.js).
export interface PersonalAccount {
  personalAccountId: string
  firstName: string
  lastName: string
  role: PersonalAccountRole
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export type NewPersonalAccount = Pick<PersonalAccount, 'firstName' | 'lastName' | 'role'>

// A field left out keeps its stored value; null clears it.
export type PersonalAccountChanges = Partial<Pick<PersonalAccount, 'firstName' | 'lastName' | 'contactEmail' | 'bio'>>
