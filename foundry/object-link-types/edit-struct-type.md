---
title: "Documentation | Structs > Edit struct types"
source: https://www.palantir.com/docs/foundry/object-link-types/edit-struct-type
fetched: 2026-09-07
---

# Edit a struct property type

1. In Ontology Manager, open the **Object types** tab in the left sidebar and select an existing object type.
2. In the object type details page, open the **Properties** tab in the left sidebar, and select the relevant struct property type from the **Properties** table.
3. In the **Property editor** panel, scroll to the **Struct fields** section and select the struct field you would like to edit. The number of edits made will appear on the top right of the Ontology Manager interface.

<img src="../../resources/foundry/object-link-types/Edit-struct.png" alt="Struct fields in the 'Property editor' panel." width="500" />

4. Make the necessary edits in the **Edit struct field** dialog, and select **Confirm**.

<img src="../../resources/foundry/object-link-types/confirm-struct-edit.png" alt="The 'Edit struct field' dialog." width="500" />

:::callout{theme="neutral"}
Note that changing a struct field's API name will result in a new struct field RID being generated. This will override the existing index, similar to the behavior of changing the property ID of a property type. Any applications that reference the updated struct field will need to be updated as well.
:::
