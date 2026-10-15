//! Typed business profile proposals carried by company asks.

use serde::{Deserialize, Serialize};

use crate::company_profile::{validate_business_profile, BusinessProfile};
use crate::company_records::{AskCategory, AskRecord, AskType, CompanyRecordError};

/// Tag on a relay-signed ask head that carries a profile proposal.
pub const PROFILE_PROPOSAL_TAG: [&str; 2] = ["colony:profile-proposal", "1"];
/// Longest proposal summary, in characters.
pub const MAX_PROFILE_SUMMARY_CHARS: usize = 600;

/// A completed business profile presented for owner review.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ProfileProposal {
    /// What Scout added or changed and why.
    pub summary: String,
    /// The complete profile the owner will review.
    pub profile: BusinessProfile,
}

/// Validate the summary and the complete proposed profile.
pub fn validate_profile_proposal(proposal: &ProfileProposal) -> Result<(), CompanyRecordError> {
    if proposal.summary.trim().is_empty()
        || proposal.summary.chars().count() > MAX_PROFILE_SUMMARY_CHARS
    {
        return Err(CompanyRecordError::Invalid(
            "profileProposal.summary is required, 600 characters at most",
        ));
    }
    validate_business_profile(&proposal.profile).map_err(|_| {
        CompanyRecordError::Invalid("profileProposal.profile is not a valid business profile")
    })
}

/// A profile proposal is only valid on an unaddressed general approval ask.
pub fn validate_profile_proposal_ask(ask: &AskRecord) -> Result<(), CompanyRecordError> {
    let Some(proposal) = ask.profile_proposal.as_ref() else {
        return Ok(());
    };
    validate_profile_proposal(proposal)?;
    if ask.ask_type != AskType::Approval
        || ask.category != AskCategory::General
        || ask.subject.is_some()
        || ask.addressee_pubkey.is_some()
        || ask.member_proposal.is_some()
        || ask.secret_request.is_some()
        || ask.hire_proposal.is_some()
        || ask.duty_proposal.is_some()
        || ask.spend_allowance_proposal.is_some()
        || ask.tool_consent.is_some()
        || ask.options.is_some()
        || ask.items.is_some()
    {
        return Err(CompanyRecordError::Invalid(
            "profile proposals need an unaddressed general approval ask",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::company_records::{
        ask_resolution_denied_reason, validate_ask_record, AskResolver, CommunityRole,
        COMPANY_RECORD_SCHEMA_VERSION,
    };
    use uuid::Uuid;

    fn profile() -> BusinessProfile {
        serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "name": "Lerato Designs",
            "timeZone": "Africa/Johannesburg"
        }))
        .expect("valid profile")
    }

    fn proposal_ask() -> AskRecord {
        AskRecord {
            schema_version: COMPANY_RECORD_SCHEMA_VERSION,
            ask_id: Uuid::from_u128(7),
            ask_type: AskType::Approval,
            category: AskCategory::General,
            title: "Your business profile".into(),
            body: None,
            thread_root_event_id: Some("a".repeat(64)),
            thread_start: None,
            addressee_pubkey: None,
            decide_by: None,
            options: None,
            items: None,
            tool_consent: None,
            subject: None,
            member_proposal: None,
            secret_request: None,
            hire_proposal: None,
            duty_proposal: None,
            spend_allowance_proposal: None,
            profile_proposal: Some(ProfileProposal {
                summary: "I added what the business sells from your website.".into(),
                profile: profile(),
            }),
        }
    }

    #[test]
    fn proposal_is_valid_and_round_trips() {
        let ask = proposal_ask();
        validate_ask_record(&ask, false).expect("valid proposal ask");
        let json = serde_json::to_value(&ask).expect("serialize");
        assert_eq!(json["profileProposal"]["profile"]["name"], "Lerato Designs");
        assert_eq!(
            serde_json::from_value::<AskRecord>(json).expect("parse"),
            ask
        );
        assert_eq!(PROFILE_PROPOSAL_TAG, ["colony:profile-proposal", "1"]);
    }

    #[test]
    fn proposal_rejects_wrong_shape_and_invalid_content() {
        let mut ask = proposal_ask();
        ask.category = AskCategory::Money;
        assert!(validate_ask_record(&ask, false).is_err());
        let mut ask = proposal_ask();
        ask.addressee_pubkey = Some("b".repeat(64));
        assert!(validate_ask_record(&ask, false).is_err());
        let mut ask = proposal_ask();
        ask.profile_proposal.as_mut().expect("proposal").summary = " ".into();
        assert!(validate_ask_record(&ask, false).is_err());
        let mut ask = proposal_ask();
        ask.profile_proposal.as_mut().expect("proposal").summary =
            "x".repeat(MAX_PROFILE_SUMMARY_CHARS + 1);
        assert!(validate_ask_record(&ask, false).is_err());
    }

    #[test]
    fn only_human_owners_and_admins_resolve_profile_proposals() {
        let ask = proposal_ask();
        let pubkey = "c".repeat(64);
        let denied = |role, is_agent| {
            ask_resolution_denied_reason(
                &ask,
                AskResolver {
                    pubkey: &pubkey,
                    is_agent,
                    community_role: role,
                    is_channel_member: true,
                },
            )
        };
        assert_eq!(denied(Some(CommunityRole::Owner), false), None);
        assert_eq!(denied(Some(CommunityRole::Admin), false), None);
        assert!(denied(Some(CommunityRole::Member), false).is_some());
        assert!(denied(Some(CommunityRole::Partner), false).is_some());
        assert!(denied(Some(CommunityRole::Owner), true).is_some());
    }
}
