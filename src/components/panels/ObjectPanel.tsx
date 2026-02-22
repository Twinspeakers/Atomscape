import { useState } from 'react'
import { useAppStore } from '@state/store'

function riskToneClass(riskRating?: number): string {
  const risk = typeof riskRating === 'number' ? riskRating : 0
  if (risk >= 0.75) {
    return 'bg-amber-400/25 text-amber-100'
  }

  if (risk >= 0.55) {
    return 'bg-amber-400/18 text-amber-200'
  }

  if (risk >= 0.35) {
    return 'bg-slate-200/15 text-slate-100'
  }

  return 'bg-slate-700/35 text-slate-200'
}

function contactRoleLabel(contactRole?: 'target' | 'node'): string {
  return contactRole === 'node' ? 'Extraction Node' : 'Target'
}

export function ObjectPanel() {
  const selectedObject = useAppStore((state) => state.selectedObject)
  const contacts = useAppStore((state) => state.radarContacts)
  const [contactsCollapsed, setContactsCollapsed] = useState(true)
  const topContacts = contacts.slice(0, 5)

  return (
    <div className="ui-stack-sm">
      {!selectedObject ? (
        <div className="ui-surface-card ui-stack-sm">
          <p>No object selected.</p>
          <p className="ui-note">Tip: click a cleanup target to inspect class, risk, and expected output.</p>
        </div>
      ) : (
        <div className="ui-surface-card ui-stack-sm">
          <p className="ui-title">{selectedObject.name}</p>
          <p className="ui-body-copy">{selectedObject.description}</p>
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <span className="ui-pill-soft">Type: {selectedObject.targetKindLabel ?? selectedObject.type}</span>
            <span className="ui-pill-soft">Range: {selectedObject.distance.toFixed(1)} m</span>
            {selectedObject.targetClassId && (
              <span className="ui-pill-soft">
                Class: {selectedObject.targetClassLabel ?? selectedObject.targetClassId}
              </span>
            )}
            {typeof selectedObject.riskRating === 'number' && (
              <span className={`ui-pill-soft ${riskToneClass(selectedObject.riskRating)}`}>
                Risk: {selectedObject.riskBand ?? 'Unknown'} ({(selectedObject.riskRating * 100).toFixed(0)}%)
              </span>
            )}
            {selectedObject.zoneId && (
              <span className="ui-pill-soft">Zone: {selectedObject.zoneLabel ?? selectedObject.zoneId}</span>
            )}
            {selectedObject.elementSymbol && (
              <span className="ui-pill-soft">Signature: {selectedObject.elementSymbol}</span>
            )}
            {typeof selectedObject.integrity === 'number' && (
              <span className="ui-pill-soft">Integrity: {selectedObject.integrity}%</span>
            )}
          </div>
          {selectedObject.expectedYieldTop && selectedObject.expectedYieldTop.length > 0 && (
            <div className="ui-surface-card ui-stack-xs">
              <p className="ui-label">Expected Material Profile</p>
              {selectedObject.expectedYieldTop.map((row, index) => (
                <p key={`${row}-${index}`} className="ui-body-copy">{row}</p>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="ui-surface-card ui-stack-xs">
        <div className="flex items-center justify-between gap-2">
          <p className="ui-label">Nearest Contacts</p>
          <button
            type="button"
            onClick={() => setContactsCollapsed((collapsed) => !collapsed)}
            className="ui-action-button-sm bg-slate-900/70 text-slate-200 hover:bg-slate-800/80"
          >
            {contactsCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {!contactsCollapsed && (
          <>
            {topContacts.length === 0 && (
              <p className="ui-note">No targets in radar range.</p>
            )}
            {topContacts.map((contact) => (
              <div key={contact.id} className="ui-surface-card-strong">
                <div className="flex items-center justify-between gap-2">
                  <p className="ui-body-copy">
                    {contact.targetClassLabel
                      ?? contact.targetClassId
                      ?? (contact.contactRole === 'node' ? 'Extraction Node' : 'Unknown Target')}
                  </p>
                  <span className="ui-note">
                    {contact.riskBand ?? 'Unknown'}
                  </span>
                </div>
                <p className="ui-note">
                  {contactRoleLabel(contact.contactRole)}
                  {' | '}
                  {contact.targetKindLabel ?? contact.targetKind ?? 'Unknown Type'}
                  {' | '}
                  {contact.zoneLabel ?? contact.zoneId ?? 'Unzoned'}
                  {' | '}
                  {contact.distance.toFixed(1)} m
                </p>
                {contact.expectedYieldPreview && (
                  <p className="ui-note">Yield: {contact.expectedYieldPreview}</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

