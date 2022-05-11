import { Event } from '@aws-sdk/client-cloudtrail'
import { CloudTrailUserEvent } from '../src/CloudTrailUserEvent'

const validEvent: Event = {
	CloudTrailEvent: JSON.stringify({ userIdentity: { principalId: 'AVIAGJEOJWGWEFJQ412FAJ:john.smith@example.com' } }),
	EventTime: new Date('2022-01-02T03:04:05Z'),
}

describe('CloudTrailUserEvent', () => {
	describe('succeeds when', () => {
		it('gets a valid event', () => {
			expect(new CloudTrailUserEvent(validEvent)).toMatchInlineSnapshot(`
CloudTrailUserEvent {
  "email": "john.smith@example.com",
  "eventTime": 2022-01-02T03:04:05.000Z,
  "iamRoleId": "AVIAGJEOJWGWEFJQ412FAJ",
}
`)
		})
	})
})