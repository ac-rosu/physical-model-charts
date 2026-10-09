# Physical model examples

Each example is valid `physical` DSL.

## 1. A single machine (partial model)

A case packer modelled on its own. Per TR88 the machine is the unit, so the model
starts there.

```physical
physical Case Packer
machine CP1 "Case Packer"
  note "Wrap-around, 20 cases/min"
  em INF "Infeed"
    cm M101 "Infeed Conveyor"
    cm B101 "Product Present"
  em ERE "Case Erector"
    cm M201 "Magazine Drive"
    cm YV201 "Vacuum Cups"
  em GLU "Hot-Melt Glue"
    em GLU_T "Tank"
      cm TIC301 "Tank Temperature Loop"
    cm YV302 "Glue Gun"
  cm ES001 "E-Stop Circuit"
```

## 2. A filling line with a shared CIP skid

The CIP skid is a common resource directly under the process cell. Both units use it.

```physical
physical Filling Line 1
cell PC1 "Filling Line 1"
  em CIP "CIP Skid" shared
    cm P900 "CIP Supply Pump"
    cm TT900 "CIP Temperature"
  unit U1 "Filler"
    uses CIP
    em DOS "Dosing" recipe-aware
      cm XV101 "Inlet Valve"
      cm P101 "Dosing Pump"
      cm FT101 "Flow Meter"
    em CAP "Capper"
      cm M201 "Capper Drive"
  unit U2 "Mixer"
    uses CIP
    em AGI "Agitator"
      cm M301 "Agitator Motor"
```

## 3. Full hierarchy, strict, with trains

```physical
physical ACME Batch Plant
strict
direction LR
enterprise ACME "ACME Chemicals"
  site S1 "Antwerp"
    area A1 "Polymers"
      cell PC1 "Reactor Cell 1"
        em HTR "Hot Oil Supply" shared
          cm TIC01 "Supply Temperature"
        unit R1 "Reactor 1"
          uses HTR
          em R1_CHG "Charge" recipe-aware
            cm R1_XV1 "VCM Valve"
        unit R2 "Reactor 2"
          uses HTR
          em R2_CHG "Charge" recipe-aware
            cm R2_XV1 "VCM Valve"
        unit D1 "Dryer"
          cm D1_M1 "Dryer Drive"
train "Train A" R1 D1
train "Train B" R2 D1
```

## 4. Compound control module (valve header)

```physical
unit U1 "Reactor"
  cm HDR "Discharge Header"
    cm XV1 "To Tank 1"
    cm XV2 "To Tank 2"
    cm XV3 "To Drain"
```

## Common mistakes

| Wrong | Why | Right |
|-------|-----|-------|
| `unit Big Filler` | unquoted multi-word label | `unit U1 "Big Filler"` |
| `cm` with an `em` indented under it | a CM cannot contain an EM | make the outer one an `em` |
| `area A1` → `unit U1` | the process cell may not be skipped | add a `cell` in between |
| `enterprise E` → `area A` | the site may not be skipped | add a `site` |
| `em shared "CIP"` | the first bare word is the id | `em CIP "CIP Skid" shared` |
| `train "T" R1 R2` with R1, R2 in different cells | a train stays in one cell | one train per cell |
