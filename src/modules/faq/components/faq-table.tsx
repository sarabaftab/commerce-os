import Link from "next/link";

import type { AdminFaqListRow } from "@/modules/faq";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

import { DeleteFaqButton } from "./delete-faq-button";

type FaqTableProps = {
  faqs: AdminFaqListRow[];
};

function previewAnswer(answer: string) {
  const compact = answer.replace(/\s+/g, " ").trim();
  if (compact.length <= 80) {
    return compact;
  }
  return `${compact.slice(0, 77)}…`;
}

export function FaqTable({ faqs }: FaqTableProps) {
  if (faqs.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No FAQs yet. Add your first FAQ.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Question</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort order</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faqs.map((faq) => (
            <TableRow key={faq.id}>
              <TableCell>
                <div className="font-medium">{faq.question}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{previewAnswer(faq.answer)}</div>
              </TableCell>
              <TableCell>
                <Badge variant={faq.isActive ? "default" : "secondary"}>
                  {faq.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{faq.sortOrder}</TableCell>
              <TableCell className="text-xs text-[color:var(--admin-ink-muted)]">
                {faq.updatedAt.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/faqs/${faq.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteFaqButton faqId={faq.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
