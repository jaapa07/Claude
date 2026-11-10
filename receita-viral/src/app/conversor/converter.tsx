"use client";
import * as React from "react";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, NativeSelect } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { celsiusToFahrenheit, convert, DENSITIES, fahrenheitToCelsius, MASS_UNITS, VOLUME_UNITS } from "@/lib/units";

const UNITS = [...Object.keys(VOLUME_UNITS), ...Object.keys(MASS_UNITS)];

export function Converter() {
  const [value, setValue] = React.useState(1);
  const [from, setFrom] = React.useState("xícara");
  const [to, setTo] = React.useState("g");
  const [ingredient, setIngredient] = React.useState("farinha de trigo");
  const [temp, setTemp] = React.useState(180);
  const [tempUnit, setTempUnit] = React.useState<"C" | "F">("C");

  const result = convert(value, from, to, ingredient);
  const fmt = (n: number) => (n >= 100 ? Math.round(n).toString() : (Math.round(n * 100) / 100).toString().replace(".", ","));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Peso e volume</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_1fr] sm:items-end">
            <div>
              <Label htmlFor="cv-val">Quantidade</Label>
              <Input id="cv-val" type="number" min={0} step="any" value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="cv-from">De</Label>
              <NativeSelect id="cv-from" value={from} onChange={(e) => setFrom(e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </NativeSelect>
            </div>
            <button type="button" onClick={() => (setFrom(to), setTo(from))} className="mx-auto flex size-11 items-center justify-center rounded-full border border-border hover:bg-muted" aria-label="Inverter unidades">
              <ArrowRightLeft className="size-4" />
            </button>
            <div>
              <Label htmlFor="cv-to">Para</Label>
              <NativeSelect id="cv-to" value={to} onChange={(e) => setTo(e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </NativeSelect>
            </div>
          </div>
          <div>
            <Label htmlFor="cv-ing">Ingrediente (necessário para converter volume ↔ peso)</Label>
            <NativeSelect id="cv-ing" value={ingredient} onChange={(e) => setIngredient(e.target.value)}>
              {Object.keys(DENSITIES).map((i) => <option key={i}>{i}</option>)}
            </NativeSelect>
          </div>
          <div className="rounded-2xl bg-primary-soft p-5 text-center" aria-live="polite">
            {result == null ? (
              <p className="text-sm text-muted-foreground">Não é possível converter {from} em {to} sem densidade conhecida.</p>
            ) : (
              <p className="text-3xl font-extrabold">
                {fmt(value)} {from} = <span className="text-primary">{fmt(result)} {to}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Referências: 1 xícara = 240 ml · 1 colher de sopa = 15 ml · 1 colher de chá = 5 ml. Pesos por volume são médias e variam conforme o modo de medir.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Temperatura do forno</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input type="number" value={temp} onChange={(e) => setTemp(Number(e.target.value))} aria-label="Temperatura" />
            <NativeSelect value={tempUnit} onChange={(e) => setTempUnit(e.target.value as "C" | "F")} className="w-28" aria-label="Escala">
              <option value="C">°C</option>
              <option value="F">°F</option>
            </NativeSelect>
          </div>
          <p className="rounded-2xl bg-muted p-4 text-center text-2xl font-extrabold">
            {temp}°{tempUnit} = <span className="text-primary">{tempUnit === "C" ? `${celsiusToFahrenheit(temp)}°F` : `${fahrenheitToCelsius(temp)}°C`}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {[["Baixo", 150], ["Médio", 180], ["Médio-alto", 200], ["Alto", 220]].map(([l, c]) => (
              <div key={l as string} className="rounded-xl border border-border p-3 text-center">
                <p className="font-semibold">{l}</p>
                <p className="text-muted-foreground">{c}°C · {celsiusToFahrenheit(c as number)}°F</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
