"""
Generate comprehensive indicator specifications document
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import json

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), 'apps', 'api', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise Exception(f"DATABASE_URL not found")
engine = create_engine(DATABASE_URL)

def main():
    with engine.connect() as conn:
        # Get all governance areas
        areas = conn.execute(text('''
            SELECT id, code, name
            FROM governance_areas
            ORDER BY id
        ''')).fetchall()

        output = []
        output.append('# SGLGB Indicator Specifications')
        output.append('')
        output.append('This document provides a complete specification of all indicators in the VANTAGE SGLGB assessment system.')
        output.append('')
        output.append(f'**Generated:** 2025-11-18')
        output.append('')
        output.append('---')
        output.append('')

        # Summary table
        output.append('## Summary')
        output.append('')
        output.append('| Area | Name | Parent Indicators | Leaf Indicators | Total |')
        output.append('|------|------|-------------------|-----------------|-------|')

        total_parents = 0
        total_leaves = 0

        for area in areas:
            parents = conn.execute(text('''
                SELECT COUNT(*)
                FROM indicators
                WHERE governance_area_id = :area_id
                AND parent_id IS NULL
            '''), {'area_id': area[0]}).fetchone()[0]

            leaves = conn.execute(text('''
                SELECT COUNT(*)
                FROM indicators
                WHERE governance_area_id = :area_id
                AND parent_id IS NOT NULL
            '''), {'area_id': area[0]}).fetchone()[0]

            total_parents += parents
            total_leaves += leaves

            output.append(f'| {area[0]} | {area[2]} | {parents} | {leaves} | {parents + leaves} |')

        output.append(f'| **TOTAL** | | **{total_parents}** | **{total_leaves}** | **{total_parents + total_leaves}** |')
        output.append('')
        output.append(f'**Assessment Coverage:** {total_leaves} leaf indicators must be completed for SGLGB validation')
        output.append('')
        output.append('---')
        output.append('')

        # Detailed breakdown by area
        for area in areas:
            output.append(f'## Area {area[0]}: {area[2]}')
            output.append('')
            output.append(f'**Code:** {area[1]}')
            output.append('')

            # Get all indicators for this area
            indicators = conn.execute(text('''
                SELECT
                    id,
                    indicator_code,
                    name,
                    description,
                    parent_id,
                    is_bbi,
                    is_auto_calculable,
                    is_profiling_only,
                    selection_mode,
                    remark_schema,
                    form_schema,
                    mov_checklist_items
                FROM indicators
                WHERE governance_area_id = :area_id
                ORDER BY
                    CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
                    indicator_code
            '''), {'area_id': area[0]}).fetchall()

            if not indicators:
                output.append('*No indicators defined for this area.*')
                output.append('')
                continue

            # Group by parent
            parents_dict = {}
            orphans = []

            for ind in indicators:
                if ind[4] is None:  # parent_id is None = parent
                    parents_dict[ind[0]] = {
                        'info': ind,
                        'children': []
                    }

            for ind in indicators:
                if ind[4] is not None:  # has parent
                    if ind[4] in parents_dict:
                        parents_dict[ind[4]]['children'].append(ind)
                    else:
                        orphans.append(ind)

            # Output organized by parent
            for parent_id, parent_data in parents_dict.items():
                parent = parent_data['info']
                children = parent_data['children']

                output.append(f'### {parent[1]} - {parent[2]}')
                output.append('')

                if parent[3]:
                    output.append(f'**Description:** {parent[3]}')
                    output.append('')

                # Parent metadata
                metadata = []
                if parent[5]:  # is_bbi
                    metadata.append('🔷 **BBI (Budget-Based Indicator)**')
                if parent[6]:  # is_auto_calculable
                    metadata.append('🤖 **Auto-calculable**')
                if parent[7]:  # is_profiling_only
                    metadata.append('📊 **Profiling Only**')

                if metadata:
                    output.append(' | '.join(metadata))
                    output.append('')

                # Children
                if children:
                    output.append(f'**Sub-indicators: {len(children)}**')
                    output.append('')

                    for child in children:
                        output.append(f'#### {child[1]} - {child[2]}')
                        output.append('')

                        if child[3]:
                            # Truncate long descriptions
                            desc = child[3]
                            if len(desc) > 200:
                                desc = desc[:200] + '...'
                            output.append(f'*{desc}*')
                            output.append('')

                        # Child metadata
                        child_meta = []
                        if child[5]:
                            child_meta.append('🔷 BBI')
                        if child[6]:
                            child_meta.append('🤖 Auto-calculable')
                        if child[7]:
                            child_meta.append('📊 Profiling Only')
                        if child[8]:
                            child_meta.append(f'📋 Selection: {child[8]}')

                        if child_meta:
                            output.append('**Attributes:** ' + ', '.join(child_meta))
                            output.append('')

                        # MOV Checklist items count
                        if child[11]:
                            checklist = child[11]
                            if isinstance(checklist, list) and len(checklist) > 0:
                                output.append(f'**MOV Checklist Items:** {len(checklist)}')
                                output.append('')

                        # Validation options
                        if child[9]:
                            schema = child[9]
                            conditional_remarks = schema.get('conditional_remarks', [])
                            has_considered = any(
                                cr.get('condition', '').lower() in ['considered', 'conditional']
                                for cr in conditional_remarks
                            )
                            if has_considered:
                                output.append('**Validation:** Met / Unmet / **Considered** ✓')
                            else:
                                output.append('**Validation:** Met / Unmet')
                        else:
                            output.append('**Validation:** Met / Unmet')

                        output.append('')
                else:
                    output.append('*No sub-indicators defined.*')
                    output.append('')

                output.append('---')
                output.append('')

            # Handle orphans if any
            if orphans:
                output.append('### Orphaned Indicators')
                output.append('')
                for orph in orphans:
                    output.append(f'- **{orph[1]}** - {orph[2]} (Parent ID: {orph[4]} not found)')
                output.append('')

        # Footer
        output.append('---')
        output.append('')
        output.append('## Legend')
        output.append('')
        output.append('- 🔷 **BBI** - Budget-Based Indicator (mandatory budget allocation required)')
        output.append('- 🤖 **Auto-calculable** - Value automatically calculated from other indicators')
        output.append('- 📊 **Profiling Only** - For data collection purposes, not scored')
        output.append('- 📋 **Selection Mode** - How the indicator response is collected')
        output.append('')
        output.append('## Validation Options')
        output.append('')
        output.append('- **Met** - Indicator fully satisfies all requirements')
        output.append('- **Unmet** - Indicator does not meet requirements')
        output.append('- **Considered** - Indicator conditionally passes (only available for specific indicators)')
        output.append('')
        output.append('## Assessment Status Flow')
        output.append('')
        output.append('1. **DRAFT** - BLGU is filling out the assessment')
        output.append('2. **SUBMITTED** - BLGU has submitted for assessor review')
        output.append('3. **IN_REVIEW** - Assessor is reviewing the submission')
        output.append('4. **REWORK** - Assessor requested changes (BLGU can revise once)')
        output.append('5. **AWAITING_FINAL_VALIDATION** - Assessment passed assessor review, awaiting validator approval')
        output.append('6. **COMPLETED** - Validator has completed final validation')
        output.append('')
        output.append('---')
        output.append('')
        output.append('*This document is auto-generated from the VANTAGE database.*')

        # Write to file
        output_path = os.path.join(os.path.dirname(__file__), 'docs', 'INDICATOR_SPECIFICATIONS.md')
        with open(output_path, 'w') as f:
            f.write('\n'.join(output))

        print(f'✅ Generated {output_path}')
        print(f'   Total indicators: {total_parents + total_leaves}')
        print(f'   - Parent indicators: {total_parents}')
        print(f'   - Leaf indicators: {total_leaves}')

if __name__ == "__main__":
    main()
