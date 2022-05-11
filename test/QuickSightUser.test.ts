import { User } from '@aws-sdk/client-quicksight'
import { QuickSightUser } from '../src/QuickSightUser'

const validUser: User = {
	Active: true,
	Arn: 'arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-admin-role/john.smith@example.com',
	Email: 'john.smith@example.com',
	PrincipalId: 'federated/iam/ARIAGRGHRGGERHQWOJ:john.smith@example.com',
	UserName: 'quicksight-admin-role/john.smith@example.com',
	Role: 'ADMIN',
}

describe('QuickSightUser', () => {
	describe('succeeds when', () => {
		it('gets a valid user', () => {
			expect(new QuickSightUser(validUser)).toMatchInlineSnapshot(`
QuickSightUser {
  "arn": "arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-admin-role/john.smith@example.com",
  "email": "john.smith@example.com",
  "iamRoleId": "ARIAGRGHRGGERHQWOJ",
  "iamRoleName": "quicksight-admin-role",
  "invalid": false,
  "role": "ADMIN",
  "username": "quicksight-admin-role/john.smith@example.com",
}
`)
		})

		it('gets a user with an invalid username', () => {
			const user = new QuickSightUser({ ...validUser, UserName: 'N/A' })
			expect(user.invalid).toBe(true)
			expect(user).toMatchInlineSnapshot(`
QuickSightUser {
  "arn": "arn:aws:quicksight:us-east-1:1234567890:user/default/quicksight-admin-role/john.smith@example.com",
  "email": "john.smith@example.com",
  "iamRoleId": "ARIAGRGHRGGERHQWOJ",
  "iamRoleName": "N",
  "invalid": true,
  "role": "ADMIN",
  "username": "N/A",
}
`)
		})
	})
})