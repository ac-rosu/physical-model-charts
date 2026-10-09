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

## 5. A large cell split into several diagrams

A bottling cell with 5 units, 21 EMs and 158 CMs (63 valves, 59 sensors, 2 robots,
13 guard doors). In one diagram it is about 7,600 px wide, so it is split into an
overview, the cell resources, and one diagram per unit (see "Large machines and cells"
in SKILL.md).

**Overview**: the cell's children and each unit's children, nothing deeper.

```physical
physical Bottling Cell 1
cell PC1 "Bottling Cell 1"
  em CIP "CIP Skid" exclusive
  em AIR "Compressed Air" shared
  cm ES000 "Cell E-Stop Zone"
  unit U1 "Product Tank"
    uses CIP
    em U1_CHG "Charge" recipe-aware
    em U1_AGI "Agitation" recipe-aware
    em U1_TMP "Heating" recipe-aware
    em U1_TRF "Transfer"
    em U1_CLN "CIP Connection"
    cm U1_TNK "Tank Instruments"
  unit U2 "Rotary Filler"
    uses CIP AIR
    em U2_INF "Infeed"
    em U2_BWL "Filler Bowl"
    em U2_FIL "Filling Carousel" recipe-aware
    em U2_DIS "Discharge"
    cm U2_GRD "Guard Doors"
    cm ES200 "E-Stop Circuit"
  unit U3 "Capper"
    uses AIR
    em U3_FED "Cap Feeder"
    em U3_CAP "Capping Turret" recipe-aware
    em U3_INS "Inspection"
    cm U3_GRD "Guard Doors"
    cm ES300 "E-Stop Circuit"
  unit U4 "Robot Case Packer"
    uses AIR
    em U4_INF "Lane Infeed"
    em U4_ERE "Case Erector"
    em U4_ROB "Pick & Place Robot" recipe-aware
    em U4_CLO "Case Closer"
    cm U4_GRD "Guarding"
    cm ES400 "E-Stop Circuit"
  unit U5 "Robot Palletizer"
    uses AIR
    em U5_LAY "Layer Forming"
    em U5_ROB "Palletizing Robot" recipe-aware
    em U5_PAL "Pallet Handling"
    cm U5_GRD "Guarding"
    cm ES500 "E-Stop Circuit"
```

**Cell resources**: the cell-level EMs and CMs, with their devices.

```physical
physical PC1 Cell Resources
cell PC1 "Bottling Cell 1"
  em CIP "CIP Skid" exclusive
    cm P901 "CIP Supply Pump"
    cm XV901 "Caustic Valve"
    cm XV902 "Acid Valve"
    cm XV903 "Rinse Water Valve"
    cm XV904 "Return Valve"
    cm TT901 "Supply Temperature"
    cm QT901 "Conductivity"
    cm FT901 "Supply Flow"
    cm LT901 "Caustic Tank Level"
  em AIR "Compressed Air" shared
    cm PT001 "Air Pressure"
    cm XV001 "Main Air Dump Valve"
  cm ES000 "Cell E-Stop Zone"
```

**U2 Rotary Filler**: the 24 identical fill valves are one CM, while the guard doors
stay individual. The top row matches U2 in the overview.

```physical
physical U2 Rotary Filler
machine U2 "Rotary Filler"
  note "Uses cell resources: CIP, AIR"
  em U2_INF "Infeed"
    cm M201 "Infeed Conveyor"
    cm M202 "Infeed Starwheel"
    cm YV201 "Bottle Stop Gate"
    cm BS201 "Bottle Present"
    cm BS202 "Backlog Full"
    cm BS203 "Backlog Low"
  em U2_BWL "Filler Bowl"
    cm XV201 "Bowl Inlet Valve"
    cm XV202 "Bowl Vent Valve"
    cm LT201 "Bowl Level"
    cm PT201 "Bowl Pressure"
  em U2_FIL "Filling Carousel" recipe-aware
    cm M203 "Carousel Drive"
    cm ZS201 "Carousel Index"
    cm FV201 "Fill Valves ×24"
      note "FV201_01 … FV201_24"
  em U2_DIS "Discharge"
    cm M204 "Discharge Starwheel"
    cm YV203 "Reject Pusher"
    cm BS204 "Bottle Fallen"
    cm BS205 "Discharge Jam"
  cm U2_GRD "Guard Doors"
    cm ZS211 "Door 1"
    cm ZS212 "Door 2"
    cm ZS213 "Door 3"
    cm ZS214 "Door 4"
  cm ES200 "E-Stop Circuit"
```

**U4 Robot Case Packer**: the robot is an EM, the gripper is a compound CM, and the
lane gates and lane sensors are collapsed arrays.

```physical
physical U4 Robot Case Packer
machine U4 "Robot Case Packer"
  note "Uses cell resources: AIR"
  em U4_INF "Lane Infeed"
    cm M401 "Lane Divider"
    cm YV401 "Lane Gates ×6"
      note "YV401 … YV406"
    cm BS401 "Lane Full ×6"
      note "BS401 … BS406"
  em U4_ERE "Case Erector"
    cm M402 "Magazine Drive"
    cm YV407 "Vacuum Cups"
    cm YV408 "Fold Cylinder 1"
    cm YV409 "Fold Cylinder 2"
    cm BS407 "Case Present"
    cm BS408 "Magazine Low"
  em U4_ROB "Pick & Place Robot" recipe-aware
    cm RB401 "Robot R1 (6-axis)"
    cm VS401 "Pick Vision"
    cm U4_GRP "Vacuum Gripper"
      cm YV411 "Vacuum Valve"
      cm YV412 "Blow-off Valve"
      cm PS401 "Vacuum OK"
  em U4_CLO "Case Closer"
    cm M403 "Tape Head"
    cm YV413 "Flap Folder"
    cm YV414 "Case Pusher"
    cm BS409 "Case Closed"
    cm BS410 "Case Discharge"
  cm U4_GRD "Guarding"
    cm ZS411 "Door 1"
    cm ZS412 "Door 2"
    cm ZS413 "Door 3"
    cm ZS414 "Door 4"
    cm LC401 "Light Curtain"
  cm ES400 "E-Stop Circuit"
```

U1, U3 and U5 follow the same pattern: `machine` with the overview's id and label, a
`note` for the cell resources it uses, then its EMs and unit-level CMs in the same order
as the overview.

## Common mistakes

| Wrong | Why | Right |
|-------|-----|-------|
| `unit Big Filler` | unquoted multi-word label | `unit U1 "Big Filler"` |
| `cm` with an `em` indented under it | a CM cannot contain an EM | make the outer one an `em` |
| `area A1` → `unit U1` | the process cell may not be skipped | add a `cell` in between |
| `enterprise E` → `area A` | the site may not be skipped | add a `site` |
| `em shared "CIP"` | the first bare word is the id | `em CIP "CIP Skid" shared` |
| `train "T" R1 R2` with R1, R2 in different cells | a train stays in one cell | one train per cell |
| `uses CIP` in a diagram that starts at `machine` | the target must exist in the same diagram | `note "Uses cell resources: CIP"` |
| 24 `cm FV201_01` … `cm FV201_24` lines | identical instances fill the diagram | `cm FV201 "Fill Valves ×24"` + `note "FV201_01 … FV201_24"` |
| a whole 100+ CM cell in one block | EMs side by side make it thousands of px wide | overview + cell resources + one diagram per unit |
