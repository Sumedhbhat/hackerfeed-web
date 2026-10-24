INSERT INTO `activity_events` (`appUserId`, `action`, `storyId`, `paperId`, `occurredAt`, `lastUpdatedDate`, `lastUpdatedBy`)
SELECT `appUserId`, `action`, `storyId`, `paperId`, `viewedAt`, `lastUpdatedDate`, `lastUpdatedBy` FROM (
	SELECT `appUserId`, 'story.read' AS `action`, `storyId`, NULL AS `paperId`, `viewedAt`, `lastUpdatedDate`, `lastUpdatedBy` FROM `story_views`
	UNION ALL
	SELECT `appUserId`, 'paper.read', NULL, `paperId`, `viewedAt`, `lastUpdatedDate`, `lastUpdatedBy` FROM `paper_views`
)
ORDER BY `viewedAt`;
--> statement-breakpoint
DROP TABLE `paper_views`;--> statement-breakpoint
DROP TABLE `story_views`;
