# FORGE model

FORGE (**Fabricate OR buy GPU Economics**) compares the total cost of building a custom AI accelerator with buying vendor GPUs.

## Decision

\[
A = TCO_{BUY} - TCO_{BUILD}
\]

BUILD wins when \(A>0\). BUY wins when \(A<0\).

## Fleet

\[
N_V(t)=N_0(1+g_D)^t
\]

\[
N_C(t)=\frac{N_V(t)}{R_P}
\]

Only fleet growth requires new hardware:

\[
\Delta N_V(t)=\max(0,N_V(t)-N_V(t-1))
\]

\[
\Delta N_C(t)=\max(0,N_C(t)-N_C(t-1))
\]

with \(N_V(-1)=N_C(-1)=0\).

## Vendor GPU price

\[
C_V(t)=C_{V,0}(1+g_V)^t
\]

Vendor HBM purchase cost is embedded in \(C_V\).

## Gross dies per wafer

\[
N_{gross}=\frac{\pi(D/2)^2}{A_D}-\frac{\pi D}{\sqrt{2A_D}}
\]

The first term is ideal wafer-area packing. The second is an edge-loss approximation.

## Good dies and logic cost

\[
N_{good}=N_{gross}Y_L
\]

\[
C_W(t)=C_{W,0}(1+g_W)^t
\]

\[
C_L(t)=\frac{C_W(t)}{N_{good}}
\]

## Custom HBM

\[
p_H(t)=p_{H,0}(1+g_H)^t
\]

\[
C_H(t)=S_C G_C p_H(t)(1+O_H)
\]

Capacity and bandwidth are:

\[
M_C=S_CG_C, \qquad BW_C=S_CB_C
\]

and likewise for the vendor GPU. Bandwidth is descriptive; its workload impact should enter through \(R_P\).

## Finished custom module

\[
C_C(t)=\frac{C_L(t)+C_H(t)+C_P}{Y_P}+C_B
\]

Final package yield therefore economically affects logic, HBM, and package/interposer cost. Board/VRM/final-test cost is added after this yield term.

## Fixed NRE

\[
NRE=C_D+C_{SW0}+C_M
\]

## IT power

\[
P_{IT,V}=P_V+S_VP_H+P_S
\]

\[
P_{IT,C}=P_C+S_CP_H+P_S
\]

## Electricity

There are 8760 hours in a non-leap year.

\[
E_V(t)=N_V(t)\frac{P_{IT,V}}{1000}(8760)(PUE)c_E
\]

\[
E_C(t)=N_C(t)\frac{P_{IT,C}}{1000}(8760)(PUE)c_E
\]

## Platform CAPEX

\[
S_V(t)=\Delta N_V(t)C_S
\]

\[
S_C(t)=\Delta N_C(t)C_S
\]

Platform CAPEX represents non-accelerator IT hardware: host/server, rack, local network, etc.

## Facility cost per deployed device

\[
F_V(t)=\Delta N_V(t)C_F
\]

\[
F_C(t)=\Delta N_C(t)C_F
\]

This is a one-time building/site/general-facility allocation.

## Power and cooling infrastructure capacity

\[
I_V(t)=N_V(t)\frac{P_{IT,V}}{1000}c_{PC}
\]

\[
I_C(t)=N_C(t)\frac{P_{IT,C}}{1000}c_{PC}
\]

This annualized capacity charge represents electrical and cooling plant required to support IT kW. It is distinct from the electricity bill.

## Software

\[
SW_V(t)=N_V(t)C_{SWV}
\]

\[
SW_C(t)=C_{SWC}
\]

## Complete BUY TCO

\[
TCO_{BUY}=\sum_{t=0}^{H-1}\left[\Delta N_V(t)(C_V(t)+C_S+C_F)+E_V(t)+I_V(t)+SW_V(t)\right]
\]

## Complete BUILD TCO

\[
TCO_{BUILD}=NRE+\sum_{t=0}^{H-1}\left[\Delta N_C(t)(C_C(t)+C_S+C_F)+E_C(t)+I_C(t)+C_{SWC}\right]
\]

## Sensitivity

FORGE currently uses a +20% one-at-a-time perturbation:

\[
x'=1.2x
\]

\[
S_x=\left[TCO_{BUY}(x')-TCO_{BUILD}(x')\right]-A_0
\]

where \(A_0\) is the baseline BUILD advantage. Parameters whose baseline is zero require scenario or absolute perturbations rather than multiplicative sensitivity.
