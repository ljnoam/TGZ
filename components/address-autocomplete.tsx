// components/address-autocomplete.tsx
"use client";

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils"; // une utilité pour classNames si vous en avez, sinon supprimez
import { Check } from "lucide-react"; // icône optionnelle pour valider la sélection

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

interface PhotonFeature {
  properties: {
    name: string;
    street: string;
    housenumber: string;
    postcode: string;
    city: string;
    country: string;
    // d’autres champs disponibles, mais on se concentre sur ceux-ci
  };
  geometry: {
    coordinates: [number, number];
  };
  // ...
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "",
  label,
  required = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Met à jour la query interne quand la valeur parent change
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Fonction pour interroger Photon (OpenStreetMap) avec débounce
  useEffect(() => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    let ignore = false;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        // Photon API : https://photon.komoot.io/
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query
        )}&lang=fr&limit=5`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur réseau Photon");
        const data = await res.json();
        if (!ignore) {
          setSuggestions(data.features || []);
          setShowDropdown(true);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error("Erreur autocomplete Photon :", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }, 300); // 300 ms de délai avant requête

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Gestion du click en dehors pour fermer le dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Quand l’utilisateur sélectionne une proposition
  const handleSelect = (feature: PhotonFeature) => {
    // Reconstruisons une adresse lisible et complète (street + housenumber + postcode + city)
    const props = feature.properties;
    let full =
      [
        props.housenumber,
        props.street,
        props.postcode,
        props.city,
        props.country,
      ]
        .filter(Boolean)
        .join(", ");
    // Si par exemple housenumber ou street manquant, on enlève automatiquement.
    if (!full) {
      // fallback sur `name` si tout le reste est vide
      full = props.name || "";
    }
    onChange(full);
    setQuery(full);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  // Gestion navigation clavier (↑ ↓ Enter / Escape)
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((idx) =>
        idx < suggestions.length - 1 ? idx + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((idx) =>
        idx > 0 ? idx - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-full">
      {label && (
        <Label htmlFor="address-autocomplete" className="text-lg text-slate-300">
          {label} {required && <span className="text-red-400">*</span>}
        </Label>
      )}
      <Input
        id="address-autocomplete"
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="text-lg py-3 mt-2 bg-slate-700 border-slate-600 text-white placeholder-slate-400 w-full"
        autoComplete="off"
        required={required}
      />

      {/* Liste de suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-800 border border-slate-600 text-white shadow-lg"
        >
          {suggestions.map((feat, idx) => {
            const props = feat.properties;
            // On affiche par exemple : "housenumber street, postcode city, country"
            const line = [
              props.housenumber,
              props.street,
              props.postcode,
              props.city,
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <li
                key={`${props.name}-${idx}`}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-700",
                  highlightedIndex === idx
                    ? "bg-slate-700"
                    : "bg-slate-800"
                )}
                onMouseDown={(e) => {
                  // onMouseDown au lieu de onClick pour ne pas perdre le focus
                  e.preventDefault();
                  handleSelect(feat);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <div>
                  <span className="block font-medium">{props.name}</span>
                  <span className="block text-sm text-slate-400">{line}</span>
                </div>
                {highlightedIndex === idx && (
                  <Check className="h-4 w-4 text-green-400" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isLoading && (
        <div className="absolute right-3 top-3 animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
      )}
    </div>
  );
}
