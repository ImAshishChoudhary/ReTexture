"use client";

import Link from "next/link";
import { Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, use } from "react";

import { useGetProject } from "@/features/projects/api/use-get-project";

import { Editor } from "@/features/editor/components/editor";
import { Button } from "@/components/ui/button";

interface EditorProjectIdPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

const EditorProjectIdPage = ({
  params,
}: EditorProjectIdPageProps) => {
  // Unwrap the params Promise using React.use()
  const { projectId } = use(params);

  const {
    data,
    isLoading,
    isError
  } = useGetProject(projectId);

  const hasShownToast = useRef(false);

  useEffect(() => {
    if (data && !hasShownToast.current) {
      toast.dismiss();
      toast.success("Project Created");
      hasShownToast.current = true;
    }
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    toast.dismiss();
    return (
      <div className="h-full flex flex-col gap-y-5 items-center justify-center">
        <TriangleAlert className="size-6 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Failed to fetch project
        </p>
        <Button asChild variant="secondary">
          <Link href="/">
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  return <Editor initialData={data} />
};
 
export default EditorProjectIdPage;
