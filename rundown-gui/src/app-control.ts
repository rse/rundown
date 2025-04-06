/*
**  Rundown - Generate Rundown Scripts for Teleprompting
**  Copyright (c) 2023-2024 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under GPL 3.0 <https://spdx.org/licenses/GPL-3.0-only>
*/

export interface Document {
    id:        number
    timestamp: Date
    sections:  number
    chunks:    number
    data?:     any
}

export interface DocumentSet {
    id:        number
    name:      string
    position:  number
    documents: Document[]
}

export interface AppControl {
    /*  open/close panel  */
    panelOpened             (): boolean
    panelToggle             (): boolean

    /*  determine available information  */
    docSetsList             (): DocumentSet[]
    docList                 (): Document[]

    /*  determine selected information  */
    docSetSelected          (): DocumentSet
    docSelected             (): Document

    /*  change selected information  */
    docSetSelectById        (id: number): void
    docSetSelectByDirection (direction: "first" | "prev" | "next" | "last"): void
    docSelectById           (id: number): void
    docSelectByDirection    (direction: "first" | "prev" | "next" | "last"): void
}
