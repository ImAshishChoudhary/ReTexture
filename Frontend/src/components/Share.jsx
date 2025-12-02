import { useSelector } from "react-redux";
import { Button, Space, Popover, Tooltip } from "antd";
import jsPDF from "jspdf";

import { BsDownload } from "react-icons/bs";
import { FaRegFilePdf } from "react-icons/fa6";
import { TbPhotoDown } from "react-icons/tb";

export default function Share({ stageRef }) {
  const { editorPages, activeIndex } = useSelector((state) => state?.editor ?? {});

  const getFileName = (ext) =>
    `page-${(editorPages[activeIndex] || {})?.id || activeIndex}.${ext}`;

  const downloadURI = (uri, name) => {
    const link = document.createElement("a");
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPNG = () => {
    const uri = stageRef?.current?.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
    });
    downloadURI(uri, getFileName("png"));
  };

  const exportJPG = () => {
    const uri = stageRef?.current?.toDataURL({
      pixelRatio: 2,
      mimeType: "image/jpeg",
    });
    downloadURI(uri, getFileName("jpg"));
  };

  const exportPDF = () => {
    const uri = stageRef?.current?.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const pdf = new jsPDF("l", "pt", [stageRef?.current?.width(), stageRef?.current?.height()]);
    pdf?.addImage(uri, "PNG", 0, 0, stageRef?.current?.width(), stageRef?.current?.height());
    pdf?.save(getFileName("pdf"));
  };


  return (
    <Tooltip title="Download" color="blue">
      <Popover
        content={
          <Space direction="vertical" style={{ width: 180 }}>
            <Button 
              block 
              icon={<TbPhotoDown size={20} />} 
              onClick={exportPNG}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              Download PNG
            </Button>
            <Button 
              block 
              icon={<TbPhotoDown size={20} />} 
              onClick={exportJPG}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              Download JPG
            </Button>
            <Button 
              block 
              icon={<FaRegFilePdf size={20} />} 
              onClick={exportPDF}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              Download PDF
            </Button>
          </Space>
        }
        title="Export Options"
        trigger="click"
      >
        <Button 
          icon={<BsDownload size={18} />} 
          type="text" 
          style={{
            border: "1px solid #e0e0e0",
            color: "#1a1a1a",
            borderRadius: 6
          }}
        />
      </Popover>
    </Tooltip>
  );
};