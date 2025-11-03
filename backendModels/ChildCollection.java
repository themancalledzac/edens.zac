package edens.zac.portfolio.backend.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO representing the relationship between a child entity (collection) and a parent collection.
 * Used in update requests to manage collection associations using the prev/new/remove pattern.
 * Represents the relationship metadata: collectionId, visibility, and order index.
 *
 * Can be used for:
 * - Collections belonging to parent collections
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChildCollection {
    private Long collectionId;
    private String name;
    private String coverImageUrl;
    private Boolean visible;
    private Integer orderIndex;
}